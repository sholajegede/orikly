import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { bump } from "./lib/counters";
import { MAX_WISHES_PER_SITE, normalizeSlug } from "./lib/constants";

/** Public: a guest leaves a wish on a live site. It waits for the owner to approve. */
export const add = mutation({
  args: {
    slug: v.string(),
    guestName: v.string(),
    message: v.string(),
    website: v.optional(v.string()), // honeypot: real people leave this empty
  },
  handler: async (ctx, a) => {
    if (a.website) return { ok: true };
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(a.slug)))
      .unique();
    if (!project || project.status !== "paid" || !project.wishesOn) throw new ConvexError("Wishes are closed.");

    const guestName = a.guestName.trim();
    const message = a.message.trim();
    if (guestName.length < 1 || guestName.length > 60) throw new ConvexError("Enter your name.");
    if (message.length < 2 || message.length > 500) throw new ConvexError("Write a message of 2 to 500 characters.");

    const lastMinute = await ctx.db
      .query("wishes")
      .withIndex("by_project", (q) => q.eq("projectId", project._id).gt("createdAt", Date.now() - 60_000))
      .take(11);
    if (lastMinute.length > 10) throw new ConvexError("Too many wishes right now. Try again in a minute.");

    const all = await ctx.db
      .query("wishes")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .take(MAX_WISHES_PER_SITE + 1);
    if (all.length >= MAX_WISHES_PER_SITE) throw new ConvexError("This wall is full.");

    await ctx.db.insert("wishes", { projectId: project._id, guestName, message, status: "pending", createdAt: Date.now() });
    await bump(ctx, "ev:wish_sent");
    await bump(ctx, `proj:${project._id}:wish_sent`, { lifetime: true });
    return { ok: true };
  },
});

export const setStatus = mutation({
  args: { id: v.id("wishes"), status: v.union(v.literal("approved"), v.literal("hidden"), v.literal("pending")) },
  handler: async (ctx, { id, status }) => {
    const user = await requireUser(ctx);
    const wish = await ctx.db.get(id);
    if (!wish) return;
    const project = await ctx.db.get(wish.projectId);
    if (!project || project.ownerId !== user._id) throw new ConvexError("Not allowed.");
    await ctx.db.patch(id, { status });
  },
});
