import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireOwnedProject, requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { limit } from "./lib/limit";
import { COST } from "./lib/constants";
import { spend } from "./packs";
import { BODY_FONTS, DISPLAY_FONTS, HERO_LAYOUTS, RADII, SCENE_KINDS, SECTION_TYPES, TONES, tidyDesign, type SiteDesign } from "./lib/design";

/**
 * The studio. After payment a background job (src/trigger/produce.ts) makes the celebration:
 * an AI art director designs the website, looks at screenshots of its own work and revises it,
 * then both films are rendered from that design with the customer's song.
 * This file is the backend half: it starts the job, talks to the model, and stores what the job makes.
 */
const MAX_PHOTOS = 30;
export const STAGES = ["queued", "designing", "reviewing", "filming", "done", "failed"] as const;
const stage = v.union(...STAGES.map((s) => v.literal(s)));

export const available = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return !!(process.env.ANTHROPIC_API_KEY && process.env.TRIGGER_SECRET_KEY && process.env.STUDIO_SECRET);
  },
});

type Run = { design: boolean; films: boolean; charged: number };

/** Put a paid celebration in the studio queue. `charged` is what the customer paid for this run, in credits. */
export async function startStudio(ctx: MutationCtx, projectId: Id<"projects">, run: Run) {
  const p = await ctx.db.get(projectId);
  if (!p || p.status !== "paid") return;
  if (p.studio && p.studio.stage !== "done" && p.studio.stage !== "failed") throw new ConvexError("The studio is already working on this.");
  await ctx.db.patch(projectId, { studio: { stage: "queued", runs: (p.studio?.runs ?? 0) + 1, at: Date.now(), ...run } });
  await ctx.scheduler.runAfter(0, internal.studio.kick, { projectId, design: run.design, films: run.films });
}

/**
 * More work on a live celebration, paid for in credits:
 *   redesign: a new design, and the films made again if the celebration has them,
 *   films:    the two films, for the first time or again after the customer edited the website.
 */
export const run = mutation({
  args: { id: v.id("projects"), what: v.union(v.literal("redesign"), v.literal("films")) },
  handler: async (ctx, { id, what }) => {
    const { user, project } = await requireOwnedProject(ctx, id);
    if (project.status !== "paid") throw new ConvexError("Publish this celebration first.");
    await limit(ctx, `studio:${user._id}`, 8, 3_600_000);
    const has = !!project.hasFilms || (project.deliverables ?? []).some((d) => d.label.startsWith("Your film"));
    const cost = what === "redesign" ? COST.redesign : has ? COST.refilm * 2 : COST.film * 2;
    const label = what === "redesign" ? "New design" : has ? "Films made again" : "Two films";
    if (project.studio && project.studio.stage !== "done" && project.studio.stage !== "failed") throw new ConvexError("The studio is already working on this.");
    await spend(ctx, user._id, id, cost, label);
    await startStudio(ctx, id, { design: what === "redesign", films: what === "films" || has, charged: cost });
    await logEvent(ctx, { name: "studio_run", userId: user._id, projectId: id, props: { what, credits: cost } });
  },
});

export const kick = internalAction({
  args: { projectId: v.id("projects"), design: v.boolean(), films: v.boolean() },
  handler: async (ctx, { projectId, design, films }) => {
    const key = process.env.TRIGGER_SECRET_KEY;
    const fail = (note: string) => ctx.runMutation(internal.studio.setStage, { projectId, stage: "failed", note });
    if (!key) return void (await fail("The studio is not switched on yet."));
    const res = await fetch("https://api.trigger.dev/api/v1/tasks/produce-celebration/trigger", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ payload: { projectId, design, films } }),
    });
    if (!res.ok) {
      console.error("Could not start the studio job", res.status, await res.text());
      await fail("The studio could not start. Try again in a minute.");
    }
  },
});

export const setStage = internalMutation({
  args: { projectId: v.id("projects"), stage, note: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.projectId);
    if (!p?.studio) return;
    const was = p.studio;
    if (was.stage === "done" || was.stage === "failed") return;
    let charged = was.charged ?? 0;
    // A run that fails costs the customer nothing: the credits go straight back.
    if (a.stage === "failed" && charged > 0) {
      const owner = await ctx.db.get(p.ownerId);
      if (owner) await ctx.db.patch(owner._id, { credits: (owner.credits ?? 0) + charged });
      const now = Date.now();
      await ctx.db.insert("payments", { projectId: a.projectId, ownerId: p.ownerId, method: "credit", amountKobo: 0, status: "refunded", note: `Studio stopped · ${charged} credits returned`, createdAt: now, confirmedAt: now });
      charged = 0;
    }
    await ctx.db.patch(a.projectId, {
      studio: { ...was, stage: a.stage, note: a.note?.slice(0, 200), at: Date.now(), charged },
      ...(a.stage === "done" && was.films ? { hasFilms: true } : {}),
    });
    if (a.stage === "done" || a.stage === "failed") await logEvent(ctx, { name: `studio_${a.stage}`, userId: p.ownerId, projectId: a.projectId, props: a.note ? { note: a.note.slice(0, 120) } : undefined });
  },
});

/** Everything the job needs to draw this celebration: the customer's words, their files, and the current design. */
export const gather = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const p = await ctx.db.get(projectId);
    if (!p || p.status !== "paid") throw new ConvexError("This celebration is not ready for the studio.");
    const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", projectId)).take(80);
    const withUrl = async (kind: "photo" | "video") =>
      (await Promise.all(assets.filter((a) => a.kind === kind).sort((a, b) => a.order - b.order).slice(0, MAX_PHOTOS).map(async (a) => ({ id: a._id as string, url: await ctx.storage.getUrl(a.storageId) })))).filter((x): x is { id: string; url: string } => !!x.url);
    const photos = await withUrl("photo");
    const clips = await withUrl("video");
    const paragraphs = [p.story, p.message].filter(Boolean).join("\n\n").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    return {
      photos,
      clips,
      songUrl: p.songStorageId ? await ctx.storage.getUrl(p.songStorageId) : null,
      design: (p.siteDesign?.v === 2 ? p.siteDesign : null) as SiteDesign | null,
      site: {
        slug: p.slug, occasion: p.occasion, names: p.names, eventDate: p.eventDate ?? null, eventTime: p.eventTime ?? null, venue: p.venue ?? null, mapUrl: p.mapUrl ?? null,
        dressCode: p.dressCode ?? null, story: p.story ?? null, message: p.message ?? null, wishesOn: p.wishesOn,
        gift: p.giftBank && p.giftAccountNumber && p.giftAccountName ? { bank: p.giftBank, name: p.giftAccountName, number: p.giftAccountNumber } : null,
      },
      brief: {
        today: new Date().toISOString().slice(0, 10),
        occasion: p.occasion, names: p.names, date: p.eventDate ?? null, time: p.eventTime ?? null, venue: p.venue ?? null, colorsOfTheDay: p.dressCode ?? null,
        headline: p.headline ?? null,
        lettersParagraphs: paragraphs.map((text, n) => ({ n, text })),
        has: { giftAccount: !!(p.giftBank && p.giftAccountNumber), wishesWall: p.wishesOn, song: !!p.songStorageId },
      },
    };
  },
});

export const saveDesign = internalMutation({
  args: { projectId: v.id("projects"), design: v.any() },
  handler: async (ctx, { projectId, design }) => {
    await ctx.db.patch(projectId, { siteDesign: design, updatedAt: Date.now() });
  },
});

export const uploadUrl = internalMutation({ args: {}, handler: async (ctx) => await ctx.storage.generateUploadUrl() });

export const dropFiles = internalMutation({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) => {
    for (const id of ids) await ctx.storage.delete(id).catch(() => {});
  },
});

export const shotUrls = internalQuery({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) => (await Promise.all(ids.map((id) => ctx.storage.getUrl(id)))).filter((u): u is string => !!u),
});

const MAX_FILM_BYTES = 200 * 1024 * 1024;

/** A finished film from the studio. One per shape; a new one replaces the old one. */
export const saveFilm = internalMutation({
  args: { projectId: v.id("projects"), storageId: v.id("_storage"), format: v.union(v.literal("portrait"), v.literal("landscape")) },
  handler: async (ctx, { projectId, storageId, format }) => {
    const p = await ctx.db.get(projectId);
    const meta = await ctx.db.system.get(storageId);
    if (!p || !meta || !(meta.contentType ?? "").startsWith("video/") || meta.size > MAX_FILM_BYTES) {
      if (meta) await ctx.storage.delete(storageId);
      throw new ConvexError("That film could not be saved.");
    }
    const label = format === "portrait" ? "Your film, tall" : "Your film, wide";
    const list = (p.deliverables ?? []).filter((d) => {
      const same = d.format === format;
      if (same) void ctx.storage.delete(d.storageId).catch(() => {});
      return !same;
    });
    await ctx.db.patch(projectId, { deliverables: format === "portrait" ? [{ label, format, storageId }, ...list] : [...list, { label, format, storageId }], updatedAt: Date.now() });
  },
});

// ---------------------------------------------------------------------------------------------
// The art director

const TOOL = {
  name: "art_direct",
  description: "Submit the complete design for this celebration: the website and the film script.",
  input_schema: {
    type: "object",
    required: ["notes", "colors", "fonts", "caps", "radius", "hero", "ticker", "sections", "closing", "focus", "film"],
    properties: {
      notes: { type: "string", description: "Two or three sentences: the idea behind this design, and on a review round, what you saw in the screenshots and what you changed." },
      colors: {
        type: "object",
        required: ["bg", "card", "ink", "muted", "loud", "loudDeep", "loudInk", "hi", "hiInk"],
        description: "Six-digit hex. bg: the ground. card: paper for cards, a step lighter or darker than bg. ink: text. muted: quiet text. loud: THE one loud colour, used for whole blocks. loudDeep: a deeper loud that reads as text on bg. loudInk: text on loud. hi: a highlighter for small chips. hiInk: text on hi.",
        properties: { bg: { type: "string" }, card: { type: "string" }, ink: { type: "string" }, muted: { type: "string" }, loud: { type: "string" }, loudDeep: { type: "string" }, loudInk: { type: "string" }, hi: { type: "string" }, hiInk: { type: "string" } },
      },
      fonts: { type: "object", required: ["display", "body"], properties: { display: { type: "string", enum: [...DISPLAY_FONTS] }, body: { type: "string", enum: [...BODY_FONTS] } } },
      caps: { type: "boolean", description: "Set the display type in capitals." },
      radius: { type: "string", enum: [...RADII] },
      hero: {
        type: "object",
        required: ["layout", "lines", "accent", "photo"],
        properties: {
          layout: { type: "string", enum: [...HERO_LAYOUTS], description: "poster: giant type only, no photo, the date ghosted behind. split: type beside an arched photo. cover: type over a full photo." },
          lines: { type: "array", items: { type: "string" }, description: "The headline, broken into 2 or 3 short lines of at most 14 characters each, e.g. ['Happy', 'birthday,', 'Yemisi.']." },
          accent: { type: "integer", description: "Which line (from 0) takes the loud colour. Usually the name." },
          sub: { type: "string", description: "A short aside under the headline, at most 40 characters, in the customer's voice." },
          left: { type: "string", description: "Small label, top left. At most 34 characters." },
          right: { type: "string", description: "Small label, top right. At most 34 characters." },
          photo: { type: "integer", description: "The cover photo number." },
        },
      },
      ticker: { type: "array", items: { type: "string" }, description: "4 to 8 very short phrases that scroll across the page: names, pet names, places, words the customer used. Only words from the brief." },
      opener: { type: "object", required: ["text"], properties: { text: { type: "string", description: "One or two sentences from the customer's own words that open the page." }, from: { type: "string" }, to: { type: "string" } } },
      count: {
        type: "object",
        required: ["label", "value", "rows"],
        description: "One big number with up to three small facts under it. Only figures stated in the brief or that follow from its dates by plain arithmetic. Leave the whole object out if there is none.",
        properties: { label: { type: "string" }, value: { type: "string", description: "Digits only." }, note: { type: "string" }, rows: { type: "array", items: { type: "object", required: ["label", "value"], properties: { label: { type: "string" }, value: { type: "string" } } } } },
      },
      sections: {
        type: "array",
        description: "The page after the opening, top to bottom. One to three walls; each of the others at most once.",
        items: {
          type: "object",
          required: ["type"],
          properties: {
            type: { type: "string", enum: [...SECTION_TYPES] },
            title: { type: "string", description: "At most 22 characters. Ends with a full stop, like a poster." },
            label: { type: "string", description: "A small line above the title." },
            sub: { type: "string" },
            tiles: {
              type: "array",
              description: "For a wall. A grid four columns wide on desktop, two on a phone. A photo takes one column, a quote takes two. The rhythm that works: two photos, then a quote, and repeat, ending on photos.",
              items: {
                type: "object",
                required: ["t"],
                properties: {
                  t: { type: "string", enum: ["photo", "quote", "clip"] },
                  photo: { type: "integer" },
                  wide: { type: "boolean", description: "A landscape photo across two columns." },
                  text: { type: "string", description: "For a quote: one line from the customer's own words, at most 90 characters." },
                  meta: { type: "string", description: "For a quote: a small note under it, e.g. where the line comes from." },
                  chip: { type: "string", description: "For a quote: two or three words in the highlighter, e.g. 'Still true'." },
                  clip: { type: "integer", description: "A video clip number." },
                },
              },
            },
            button: { type: "string", description: "For moment: the button text." },
            after: { type: "string", description: "For moment: the line shown after the tap." },
            photos: { type: "array", items: { type: "integer" }, description: "For letter: 2 to 6 photo numbers to sit beside the letter. These may repeat photos from a wall." },
            big: { type: "array", items: { type: "integer" }, description: "For letter: the paragraph numbers to set in giant type. Short paragraphs only, two or three at most." },
            sign: { type: "string", description: "For letter: the sign-off name." },
          },
        },
      },
      closing: { type: "object", required: ["lines"], properties: { lines: { type: "array", items: { type: "string" }, description: "The last words, 2 or 3 short lines." }, small: { type: "string" }, sign: { type: "string" } } },
      focus: { type: "array", description: "For EVERY photo: the point of the main face, so no crop cuts off a head.", items: { type: "object", required: ["photo", "x", "y"], properties: { photo: { type: "integer" }, x: { type: "number" }, y: { type: "number" } } } },
      film: {
        type: "array",
        description: "The film, scene by scene. 12 to 22 scenes, 50 to 80 seconds in total.",
        items: {
          type: "object",
          required: ["kind", "seconds"],
          properties: {
            kind: { type: "string", enum: [...SCENE_KINDS], description: "title: the headline animates in. photo: one photo fills the frame, with an optional line. counter: the big number counts up among flying photos. wall: a quote card beside two photos. line: one photo card beside one big line. clip: a video clip plays. wish: the candles, or confetti. closing: the last words." },
            seconds: { type: "number" },
            tone: { type: "string", enum: [...TONES], description: "The ground for this scene. Alternate light and dark; keep loud for the wish and the close." },
            photo: { type: "integer" },
            photos: { type: "array", items: { type: "integer" }, description: "For wall: exactly two photos." },
            clip: { type: "integer" },
            text: { type: "string", description: "The line on screen, at most 70 characters, from the customer's words." },
            meta: { type: "string" },
            chip: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You are the art director for Orikly. You design one celebration at a time for a Nigerian customer: a wedding, a birthday or an anniversary. From their photos and their own words you make a single-page website and a short film. Both are drawn from the one design you submit.

Your work is judged against the best personal sites people share: it must look designed for these people by a person with taste, never like a template that was filled in.

THE HOUSE STYLE
The page is a poster, not a brochure.
- Type does the work. The headline is enormous and tightly set. Section titles are short and end with a full stop: "The wall." "Make a wish." "The letter."
- One loud colour, used with conviction for whole blocks (the counter, the wish, the sign-off). A quiet ground. A highlighter for tiny chips. Nothing else competes.
- Small monospace labels sit beside the giant type and say something specific: a date, who it is from, what a number counts.
- The wall mixes photos with the customer's own lines, set as giant quotes. This is the heart of the page. The lines must be theirs.
- The letter comes last and is given room.

HOW TO CHOOSE
- Look at every photo before deciding anything. Take the palette from them: the cloth, the walls, the light, the flowers. If the customer named colours of the day, honour them. A birthday for a young woman, a sixtieth for a mother and a wedding should not look alike.
- Choose the display face for the people: Anton or Bebas Neue for loud joy, Abril Fatface or Playfair Display for glamour, Cormorant Garamond or Instrument Serif for tenderness, Fraunces for warmth, Syne or Bricolage Grotesque for modern and young. Serifs usually want caps off.
- The cover photo must be sharp, well lit and show the person being celebrated. Use the poster hero when the type alone is strong enough; split or cover when one photo deserves to lead.
- Leave out nothing: every photo goes on a wall exactly once. Put the best ones first. Group by moment or mood when there are many, with a second wall.
- Pull 6 to 12 lines for the wall from what they wrote. Shorten faithfully; never reword into something they did not say. If they wrote very little, use fewer lines and let the photos carry it.
- Give the focus point for every photo.

THE FILM
The film is the page in motion, for WhatsApp status and for a big screen. Cut it like a title sequence.
- Open on the title. Follow with the cover photo. If there is a counter, show it early.
- Then alternate: wall scenes (a line with two photos) and line scenes (one photo, one big line), changing tone between light and dark so it never sits still.
- Use one or two clips if the customer gave video. End with the wish (birthdays) and the closing.
- Each line on screen is one of theirs. Hold a scene long enough to read it twice: 3 to 5 seconds, 6 for the counter.

TRUTH
Never invent a fact. No names, dates, places, numbers or events that are not in the brief. Do not describe anyone's body, age or ethnicity. Write plain, warm English. No emoji.

Submit the whole design with the art_direct tool. Always submit the complete design, never a partial one.`;

const REVIEW = `Above are screenshots of the website exactly as your design renders, on a phone and on a desktop, followed by your current design.

Be your own hardest critic. Look at the screenshots, not at your intentions:
1. Does the first screen stop someone scrolling? Is the headline broken well, with no word orphaned or overflowing the screen?
2. Is every piece of text easy to read against its ground? Is the loud colour used with conviction, or timidly?
3. Does the wall have rhythm, or is it a block of photos followed by a block of quotes? Are any faces cut off by a crop? Fix the focus points.
4. Does any section look empty, cramped or like filler? Is any title too long for its space?
5. Would the customer be proud to send this link? Would anyone take it for a template?

Then submit the complete, improved design with art_direct. Change what the screenshots show is weak. Keep what works.`;

type Num = number | undefined;

/** The model speaks in photo and clip numbers; storage speaks in ids. Walk a design and swap one for the other. */
function remap(design: Record<string, unknown>, photo: (x: unknown) => unknown, clip: (x: unknown) => unknown): Record<string, unknown> {
  const list = (x: unknown) => (Array.isArray(x) ? x : []);
  const o = (x: unknown) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {});
  return {
    ...design,
    hero: { ...o(design.hero), photo: photo(o(design.hero).photo) },
    sections: list(design.sections).map((s) => ({ ...o(s), tiles: Array.isArray(o(s).tiles) ? list(o(s).tiles).map((t) => ({ ...o(t), photo: photo(o(t).photo), clip: clip(o(t).clip) })) : undefined, photos: Array.isArray(o(s).photos) ? list(o(s).photos).map(photo) : undefined })),
    film: list(design.film).map((s) => ({ ...o(s), photo: photo(o(s).photo), photos: Array.isArray(o(s).photos) ? list(o(s).photos).map(photo) : undefined, clip: clip(o(s).clip) })),
  };
}

/** One pass of the art director. With screenshots it is a review of the current design; without, the first design. */
export const design = internalAction({
  args: { projectId: v.id("projects"), shots: v.optional(v.array(v.id("_storage"))) },
  handler: async (ctx, { projectId, shots }): Promise<{ notes: string }> => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new ConvexError("The art director is not switched on yet.");
    const g = await ctx.runQuery(internal.studio.gather, { projectId });
    if (g.photos.length < 3) throw new ConvexError("Add at least 3 photos first.");
    const photoIds = g.photos.map((p) => p.id);
    const clipIds = g.clips.map((c) => c.id);

    const content: unknown[] = [{ type: "text", text: `The brief:\n${JSON.stringify(g.brief, null, 2)}\n\nThere are ${g.photos.length} photos, numbered from 0, and ${g.clips.length} video clips, numbered from 0 (you cannot see the clips).` }];
    g.photos.forEach((p, i) => {
      content.push({ type: "text", text: `Photo ${i}` });
      content.push({ type: "image", source: { type: "url", url: p.url } });
    });
    const review = !!(shots?.length && g.design);
    if (review) {
      const urls = await ctx.runQuery(internal.studio.shotUrls, { ids: shots! });
      urls.forEach((url, i) => {
        content.push({ type: "text", text: `Screenshot ${i + 1}` });
        content.push({ type: "image", source: { type: "url", url } });
      });
      const d = g.design as unknown as Record<string, unknown>;
      const asNumbers = remap(d, (x) => (typeof x === "string" && photoIds.includes(x) ? photoIds.indexOf(x) : undefined), (x) => (typeof x === "string" && clipIds.includes(x) ? clipIds.indexOf(x) : undefined));
      const focus = Object.entries(g.design!.focus).map(([id, [x, y]]) => ({ photo: photoIds.indexOf(id), x, y })).filter((f) => f.photo >= 0);
      content.push({ type: "text", text: `Your current design:\n${JSON.stringify({ ...asNumbers, focus, at: undefined, by: undefined, v: undefined })}\n\n${REVIEW}` });
    } else {
      content.push({ type: "text", text: "Design the website and the film, then submit with art_direct." });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5", max_tokens: 20000, output_config: { effort: "high" }, system: SYSTEM, tools: [TOOL], messages: [{ role: "user", content }] }),
    });
    if (!res.ok) {
      console.error("Art director call failed", res.status, await res.text());
      throw new ConvexError("The art director is busy. Try again in a minute.");
    }
    const body = (await res.json()) as { content?: { type: string; name?: string; input?: Record<string, unknown> }[] };
    const input = body.content?.find((b) => b.type === "tool_use" && b.name === "art_direct")?.input;
    if (!input) throw new ConvexError("The art director did not finish.");

    const pid = (n: unknown) => (typeof n === "number" ? photoIds[Math.round(n)] : undefined);
    const cid = (n: unknown) => (typeof n === "number" ? clipIds[Math.round(n)] : undefined);
    const focus: Record<string, [Num, Num]> = {};
    for (const f of Array.isArray(input.focus) ? (input.focus as { photo?: number; x?: number; y?: number }[]) : []) {
      const id = pid(f?.photo);
      if (id) focus[id] = [f.x, f.y];
    }
    const clean = tidyDesign({ ...remap(input, pid, cid), focus }, photoIds, clipIds, "ai");
    if (!clean) {
      if (review) return { notes: "The review gave nothing usable, so the first design stands." };
      throw new ConvexError("The art director's design could not be used.");
    }
    await ctx.runMutation(internal.studio.saveDesign, { projectId, design: clean });
    if (shots?.length) await ctx.runMutation(internal.studio.dropFiles, { ids: shots });
    return { notes: typeof input.notes === "string" ? input.notes.slice(0, 600) : "" };
  },
});
