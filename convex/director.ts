import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { limit } from "./lib/limit";

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
      brief: { occasion: p.occasion, names: p.names, date: p.eventDate ?? null, headline: p.headline ?? null, story: p.story ?? null, message: p.message ?? null, styles: p.videoStyles, song: p.songName ?? p.songChoice ?? null },
    };
  },
});

export const savePlan = internalMutation({
  args: { userId: v.id("users"), projectId: v.id("projects"), plan: v.any() },
  handler: async (ctx, { userId, projectId, plan }) => {
    const p = await ctx.db.get(projectId);
    if (!p || p.ownerId !== userId) return;
    await limit(ctx, `direct:${userId}`, 8, 3_600_000);
    await ctx.db.patch(projectId, { videoPlan: plan, directedCount: (p.directedCount ?? 0) + 1, updatedAt: Date.now() });
    await logEvent(ctx, { name: "video_directed", userId, projectId, props: { shots: plan.shots.length } });
  },
});

const TOOL = {
  name: "direct_video",
  description: "Submit the finished plan for the celebration video.",
  input_schema: {
    type: "object",
    required: ["shots", "kicker", "closing"],
    properties: {
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

const SYSTEM = `You are a film editor directing a short celebration video for a Nigerian customer: a wedding, a birthday or an anniversary. The video is a sequence of their own photos with camera moves, an opening title card and a closing card.

Look closely at every photo before you decide anything.

How to direct:
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

    const content: unknown[] = [{ type: "text", text: `The customer's brief:\n${JSON.stringify(brief, null, 2)}\n\nThere are ${photos.length} photos, numbered from 0. Direct the video, then call direct_video once with your plan.` }];
    photos.forEach((p, i) => {
      content.push({ type: "text", text: `Photo ${i}` });
      content.push({ type: "image", source: { type: "url", url: p.url } });
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
        max_tokens: 8000,
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

    // Store photo ids, not positions, so the plan survives the customer reordering their photos.
    const stored = { ...plan, shots: plan.shots.map((s) => ({ ...s, asset: photos[s.photo].id })), at: Date.now() };
    await ctx.runMutation(internal.director.savePlan, { userId, projectId, plan: stored });
    return { shots: plan.shots.length };
  },
});
