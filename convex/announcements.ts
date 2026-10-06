import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/auth";

/** The newest live update, shown at the bottom of every customer's sidebar. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const a = await ctx.db.query("announcements").withIndex("by_active", (q) => q.eq("active", true)).order("desc").first();
    return a ? { _id: a._id, title: a.title, body: a.body, linkUrl: a.linkUrl ?? null, linkLabel: a.linkLabel ?? null } : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("announcements").order("desc").take(30);
  },
});

export const publish = mutation({
  args: { title: v.string(), body: v.string(), linkUrl: v.optional(v.string()), linkLabel: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const title = a.title.trim().slice(0, 60);
    const body = a.body.trim().slice(0, 200);
    if (title.length < 2 || body.length < 2) throw new ConvexError("Write a title and a short message.");
    const linkUrl = a.linkUrl?.trim() || undefined;
    if (linkUrl && !/^(https:\/\/|\/)/.test(linkUrl)) throw new ConvexError("The link must start with https:// or /.");
    // One live update at a time: the new one replaces the old one.
    const live = await ctx.db.query("announcements").withIndex("by_active", (q) => q.eq("active", true)).take(20);
    for (const x of live) await ctx.db.patch(x._id, { active: false });
    await ctx.db.insert("announcements", { title, body, linkUrl, linkLabel: a.linkLabel?.trim().slice(0, 30) || undefined, active: true, createdAt: Date.now() });
  },
});

export const setActive = mutation({
  args: { id: v.id("announcements"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await requireAdmin(ctx);
    if (active) {
      const live = await ctx.db.query("announcements").withIndex("by_active", (q) => q.eq("active", true)).take(20);
      for (const x of live) await ctx.db.patch(x._id, { active: false });
    }
    await ctx.db.patch(id, { active });
  },
});
