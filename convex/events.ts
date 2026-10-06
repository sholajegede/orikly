import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { currentUser } from "./lib/auth";
import { normalizeSlug } from "./lib/constants";
import { bump } from "./lib/counters";

// Busy events only add to a sharded counter. No row is stored, so a viral page cannot flood the table.
const COUNT_ONLY = new Set(["landing_view", "site_view", "footer_click", "photo_open", "video_play", "share_click", "creators_view", "packs_view", "map_open", "gift_copy"]);
// Names a visitor without an account may send.
const ANON_OK = new Set([...COUNT_ONLY, "login_code_sent"]);

/**
 * Record one thing that happened. Safe to call from the browser, signed in or not.
 * Visitors are identified only by a random id kept for the browser session, never by name or phone.
 */
export const track = mutation({
  args: {
    name: v.string(),
    anonId: v.optional(v.string()),
    slug: v.optional(v.string()),
    source: v.optional(v.string()),
    device: v.optional(v.string()),
    props: v.optional(v.any()),
  },
  handler: async (ctx, a) => {
    if (!/^[a-z][a-z_]{1,39}$/.test(a.name)) return;
    const user = await currentUser(ctx);
    if (!user && !ANON_OK.has(a.name)) return;
    if (JSON.stringify(a.props ?? {}).length > 800) return;

    await bump(ctx, `ev:${a.name}`);
    if (a.source) await bump(ctx, `src:${a.source.slice(0, 40)}:${a.name}`);

    let projectId = undefined;
    if (a.slug) {
      const p = await ctx.db
        .query("projects")
        .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(a.slug!)))
        .unique();
      projectId = p?._id;
      if (projectId && COUNT_ONLY.has(a.name)) await bump(ctx, `proj:${projectId}:${a.name}`, { lifetime: true });
    }

    if (!COUNT_ONLY.has(a.name)) {
      await ctx.db.insert("events", {
        at: Date.now(),
        name: a.name,
        userId: user?._id,
        projectId,
        anonId: a.anonId?.slice(0, 40),
        source: a.source?.slice(0, 60),
        device: a.device?.slice(0, 20),
        props: a.props,
      });
    }

    if (user) {
      const patch: { lastSeenAt: number; firstSeenAt?: number; source?: string } = { lastSeenAt: Date.now() };
      if (!user.firstSeenAt) {
        patch.firstSeenAt = Date.now();
        await bump(ctx, "customers", { lifetime: true });
      }
      if (!user.source && a.source) patch.source = a.source.slice(0, 60);
      if (!user.lastSeenAt || Date.now() - user.lastSeenAt > 5 * 60_000 || patch.source || patch.firstSeenAt) {
        await ctx.db.patch(user._id, patch);
      }
    }
  },
});
