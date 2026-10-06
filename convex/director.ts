import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { limit } from "./lib/limit";
import { BODY_FONTS, DISPLAY_FONTS, GALLERY_LAYOUTS, HERO_VARIANTS, MOTIFS, STORY_LAYOUTS, tidyDesign } from "./lib/design";

/**
 * The AI director. Claude looks at the customer's photos and words and writes the plan for their video:
 * which photos, in what order, where the eye should rest, how the camera moves, how long each one holds.
 * The customer's own browser then plays and records that plan. Set ANTHROPIC_API_KEY to switch this on.
 */
const MAX_PHOTOS = 14;
// Every direction costs AI credits, so none before payment. A paid celebration gets its cut and one redo.
const PAID_RUNS = 2;
const MOVES = ["push", "pull", "left", "right", "up", "hold"] as const;

export const available = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return !!process.env.ANTHROPIC_API_KEY;
  },
});

export const gather = internalQuery({
  args: { userId: v.id("users"), projectId: v.id("projects") },
  handler: async (ctx, { userId, projectId }) => {
    const p = await ctx.db.get(projectId);
    if (!p || p.ownerId !== userId) throw new ConvexError("Celebration not found.");
    if (p.status === "suspended") throw new ConvexError("This site is suspended. Contact support.");
    const used = p.directedCount ?? 0;
    if (p.status !== "paid") throw new ConvexError("Your videos are directed after you pay.");
    if (used >= PAID_RUNS) throw new ConvexError("You have used your video and your free redo. Contact us if something is wrong with it.");
    const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", projectId)).take(60);
    const photos = assets.filter((a) => a.kind === "photo").sort((a, b) => a.order - b.order).slice(0, MAX_PHOTOS);
    if (photos.length < 3) throw new ConvexError("Add at least 3 photos first.");
    const urls = await Promise.all(photos.map(async (a) => ({ id: a._id as string, url: await ctx.storage.getUrl(a.storageId) })));
    return {
      photos: urls.filter((x): x is { id: string; url: string } => !!x.url),
      brief: {
        occasion: p.occasion, names: p.names, date: p.eventDate ?? null, time: p.eventTime ?? null, venue: p.venue ?? null, colorsOfTheDay: p.dressCode ?? null,
        headline: p.headline ?? null, story: p.story ?? null, noteToGuests: p.message ?? null, videoStyles: p.videoStyles, song: p.songName ?? p.songChoice ?? null,
        has: { giftAccount: !!(p.giftBank && p.giftAccountNumber), wishesWall: p.wishesOn, customerVideoClips: assets.some((a) => a.kind === "video") },
      },
    };
  },
});

export const savePlan = internalMutation({
  args: { userId: v.id("users"), projectId: v.id("projects"), plan: v.any(), design: v.optional(v.any()) },
  handler: async (ctx, { userId, projectId, plan, design }) => {
    const p = await ctx.db.get(projectId);
    if (!p || p.ownerId !== userId) return;
    await limit(ctx, `direct:${userId}`, 8, 3_600_000);
    await ctx.db.patch(projectId, { videoPlan: plan, ...(design ? { siteDesign: design } : {}), directedCount: (p.directedCount ?? 0) + 1, updatedAt: Date.now() });
    await logEvent(ctx, { name: "video_directed", userId, projectId, props: { shots: plan.shots.length } });
  },
});

const TOOL = {
  name: "direct_video",
  description: "Submit the finished website design and video plan.",
  input_schema: {
    type: "object",
    required: ["site", "shots", "kicker", "closing"],
    properties: {
      site: {
        type: "object",
        description: "The design of the celebration website.",
        required: ["colors", "fonts", "namesStyle", "hero", "motif", "sections"],
        properties: {
          colors: {
            type: "object",
            required: ["bg", "ink", "accent", "card", "muted"],
            description: "Six-digit hex colours. Draw them from the photos: the cloth, the flowers, the light. ink must read clearly on bg and on card.",
            properties: { bg: { type: "string" }, ink: { type: "string" }, accent: { type: "string" }, card: { type: "string" }, muted: { type: "string" } },
          },
          fonts: { type: "object", required: ["display", "body"], properties: { display: { type: "string", enum: [...DISPLAY_FONTS] }, body: { type: "string", enum: [...BODY_FONTS] } } },
          namesStyle: { type: "string", enum: ["upper", "italic", "plain"], description: "How the names are set in the hero." },
          hero: {
            type: "object",
            required: ["variant", "photo", "fx", "fy", "kicker"],
            properties: {
              variant: { type: "string", enum: [...HERO_VARIANTS], description: "full: one photo edge to edge. split: photo on one side, names on the other. stack: huge names above a framed photo. collage: three overlapping photos." },
              photo: { type: "integer", description: "The cover photo number." },
              extra: { type: "array", items: { type: "integer" }, description: "Two more photo numbers, for collage only." },
              fx: { type: "number" }, fy: { type: "number" },
              kicker: { type: "string", description: "A few words above the names, e.g. 'Together with their families'." },
              tagline: { type: "string", description: "One line under the names. Use the customer's headline when they wrote one." },
            },
          },
          motif: { type: "string", enum: [...MOTIFS], description: "A woven-cloth band between sections. Choose one that suits the photos, or none." },
          sections: {
            type: "array",
            description: "The page, top to bottom, after the hero. Use each of story, details, videos, moment, numbers, note, gift and wishes at most once. Use one to three galleries, and up to two quotes.",
            items: {
              type: "object",
              required: ["type"],
              properties: {
                type: { type: "string", enum: ["story", "quote", "numbers", "gallery", "details", "videos", "moment", "note", "gift", "wishes"] },
                title: { type: "string", description: "A short heading in the customer's voice. At most 40 characters." },
                layout: { type: "string", description: `For gallery: ${GALLERY_LAYOUTS.join(", ")}. For story: ${STORY_LAYOUTS.join(", ")}.` },
                photos: { type: "array", items: { type: "integer" }, description: "For gallery: the photo numbers, in order." },
                photo: { type: "integer", description: "For a story with the side layout: the photo beside it." },
                text: { type: "string", description: "For quote: a sentence taken word for word from the customer's story or note." },
                lines: { type: "array", items: { type: "string" }, description: "For a gallery with the wall layout: one short line per photo, in the same order as photos. Guests tap a photo and it flips to show the line. Use the customer's own words where they fit. Use an empty string for a photo with no line." },
                items: {
                  type: "array",
                  description: "For numbers: two to four figures that are stated in, or follow by simple arithmetic from, the customer's brief. Never invent one.",
                  items: { type: "object", required: ["value", "label"], properties: { value: { type: "string", description: "The figure, at most 8 characters, e.g. '60', '31', '2019'." }, label: { type: "string", description: "What it counts, at most 40 characters." } } },
                },
              },
            },
          },
        },
      },
      kicker: { type: "string", description: "Two to four words for the opening title card above the names, e.g. 'The wedding of'. Plain, warm, no emoji." },
      closing: { type: "string", description: "One or two sentences for the last card, at most 140 characters. Use the customer's own words when they wrote any." },
      shots: {
        type: "array",
        minItems: 3,
        maxItems: MAX_PHOTOS,
        items: {
          type: "object",
          required: ["photo", "fx", "fy", "move", "seconds"],
          properties: {
            photo: { type: "integer", description: "The photo number, as labelled." },
            fx: { type: "number", description: "Where the main subject's face is, left to right, from 0 to 1." },
            fy: { type: "number", description: "Where the main subject's face is, top to bottom, from 0 to 1." },
            move: { type: "string", enum: [...MOVES] },
            seconds: { type: "number", description: "How long the photo holds, from 1.4 to 4." },
            caption: { type: "string", description: "Optional. At most 60 characters. Leave out on most shots." },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You are the art director and film editor for one Nigerian celebration: a wedding, a birthday or an anniversary. You make two things from the customer's own photos and words: their website, and a short video. Both must feel made for these people and nobody else.

Look closely at every photo before you decide anything.

How to design the website:
- Take the colours from the photos themselves: the aso-ebi, the gele, the suit, the flowers, the wall behind them. If the customer named colours of the day, honour them. Choose a background, a text colour that reads clearly on it, one strong accent, a card colour and a muted text colour.
- Choose the type to match the people and the pictures: formal and classic, loud and joyful, soft and romantic, modern and clean.
- Choose the cover photo with care. It must be sharp, well lit and show the people being celebrated. Give the point where their faces are.
- Pick the hero layout that suits that photo: a wide scene can run edge to edge; a tight portrait often looks better split or stacked.
- Order the page like a story. Split the photos into one to three galleries with headings, grouped by moment or mood. Every photo must appear in exactly one gallery.
- Write headings in the customer's own voice, from their own facts. "How it started" is better than "Our story" only if they told you how it started.
- A quote must be copied word for word from what they wrote.
- Make one gallery a wall when the customer wrote enough to give most of its photos a line. A line is a short phrase from their own words, or a plain, warm caption of what the photo shows. Never state a fact they did not give you.
- Add a numbers section only when their words hold real figures: an age, years together, the year they met, how many children. Leave it out otherwise.
- Include one moment section. On a birthday it is candles the guest blows out; otherwise guests throw confetti. Give it a title that suits these people.
- Leave sections in even when they have no content yet; the website hides empty ones by itself.

How to direct the video:
- Choose the order for feeling, not for the order given. Open on a strong, clear image of the people being celebrated. Build through moments and details. Put the most joyful or most intimate image near the end. Close quietly.
- Leave out photos that are blurred, badly lit, near-duplicates of a better one, or where faces are cut off. Use between 6 and 14 photos when that many are good.
- For each photo give the focus point on the main subject's face, so the crop never cuts off a head in either a tall (9:16) or a wide (16:9) frame.
- Choose a camera move that suits the picture: push in on a face or an embrace, pull out to reveal a group or a setting, drift left or right across a wide scene, hold on a detail. Vary the moves. Do not repeat the same move three times in a row.
- Hold portraits and emotional pictures longer. Keep details and repeats short. The whole video should run between 25 and 45 seconds.
- Captions are rare. Use at most four, and only where a few words add meaning. Take them from the customer's own story or message, shortened faithfully.

Never invent facts. Do not add names, dates, places, relationships or events that the customer did not give you. Do not describe anyone's body, age or ethnicity. Write in plain, warm English. No emoji.`;

type Shot = { photo: number; fx: number; fy: number; move: (typeof MOVES)[number]; seconds: number; caption?: string };

/** Keep only what the video engine accepts, whatever the model returned. */
function tidy(raw: unknown, count: number): { shots: Shot[]; kicker?: string; closing?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { shots?: unknown; kicker?: unknown; closing?: unknown };
  if (!Array.isArray(r.shots)) return null;
  const num = (x: unknown, lo: number, hi: number, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback);
  const text = (x: unknown, max: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, max) : undefined);
  const seen = new Set<number>();
  const shots: Shot[] = [];
  for (const s of r.shots as Record<string, unknown>[]) {
    const photo = typeof s?.photo === "number" ? Math.round(s.photo) : -1;
    if (photo < 0 || photo >= count || seen.has(photo)) continue;
    seen.add(photo);
    const move = MOVES.includes(s.move as (typeof MOVES)[number]) ? (s.move as (typeof MOVES)[number]) : "push";
    shots.push({ photo, fx: num(s.fx, 0, 1, 0.5), fy: num(s.fy, 0, 1, 0.4), move, seconds: num(s.seconds, 1.4, 4, 2.6), caption: text(s.caption, 60) });
    if (shots.length >= MAX_PHOTOS) break;
  }
  if (shots.length < 3) return null;
  return { shots, kicker: text(r.kicker, 40), closing: text(r.closing, 140) };
}

export const direct = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<{ shots: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in.");
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new ConvexError("AI direction is not switched on yet.");
    const { photos, brief } = await ctx.runQuery(internal.director.gather, { userId, projectId });

    const content: unknown[] = [{ type: "text", text: `The customer's brief:\n${JSON.stringify(brief, null, 2)}\n\nThere are ${photos.length} photos, numbered from 0. Design the website and direct the video, then call direct_video once.` }];
    photos.forEach((p, i) => {
      content.push({ type: "text", text: `Photo ${i}` });
      content.push({ type: "image", source: { type: "url", url: p.url } });
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
        max_tokens: 14000,
        output_config: { effort: "high" },
        system: SYSTEM,
        tools: [TOOL],
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) {
      console.error("Director call failed", res.status, await res.text());
      throw new ConvexError("The director is busy. Try again in a minute.");
    }
    const body = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
    const call = body.content?.find((b) => b.type === "tool_use" && b.name === "direct_video");
    const plan = tidy(call?.input, photos.length);
    if (!plan) throw new ConvexError("The director could not finish. Try again.");

    // The model speaks in photo numbers. Swap them for photo ids before the design is checked and stored.
    const idOf = (n: unknown) => (typeof n === "number" ? photos[Math.round(n)]?.id : undefined);
    const site = (call?.input as { site?: Record<string, unknown> } | undefined)?.site;
    const hero = (site?.hero ?? {}) as Record<string, unknown>;
    const design = site
      ? tidyDesign(
          {
            ...site,
            hero: { ...hero, photo: idOf(hero.photo), extra: Array.isArray(hero.extra) ? hero.extra.map(idOf) : [] },
            sections: (Array.isArray(site.sections) ? (site.sections as Record<string, unknown>[]) : []).map((x) => {
              // Keep each line beside its photo while unknown photo numbers are dropped.
              const nums = Array.isArray(x.photos) ? x.photos : [];
              const lines = Array.isArray(x.lines) ? x.lines : [];
              const kept = nums.map((n, i) => ({ id: idOf(n), line: lines[i] })).filter((y) => !!y.id);
              return { ...x, photo: idOf(x.photo), photos: kept.map((y) => y.id), lines: kept.map((y) => y.line) };
            }),
          },
          photos.map((p) => p.id),
          "ai",
        )
      : null;

    // Store photo ids, not positions, so the plan survives the customer reordering their photos.
    const stored = { ...plan, shots: plan.shots.map((s) => ({ ...s, asset: photos[s.photo].id })), at: Date.now() };
    await ctx.runMutation(internal.director.savePlan, { userId, projectId, plan: stored, design: design ?? undefined });
    return { shots: plan.shots.length };
  },
});
