import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { currentUser, requireUser } from "./lib/auth";
import { wipeProject } from "./projects";

/** The data room: every file and every word a customer has given us, grouped by celebration. */
export const files = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const projects = await ctx.db.query("projects").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).order("desc").collect();
    let bytes = 0;
    const groups = await Promise.all(
      projects.map(async (p) => {
        const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(100);
        const media = await Promise.all(
          assets.sort((a, b) => a.order - b.order).map(async (a) => ({ id: a._id as string, kind: a.kind as string, size: a.size, at: a.createdAt, url: await ctx.storage.getUrl(a.storageId), name: a.kind === "photo" ? "Photo" : "Video clip" })),
        );
        const made = await Promise.all(
          (p.deliverables ?? []).map(async (d, i) => {
            const meta = await ctx.db.system.get(d.storageId);
            return { id: `${p._id}-made-${i}`, kind: "finished", size: meta?.size ?? 0, at: meta?._creationTime ?? p.updatedAt, url: await ctx.storage.getUrl(d.storageId), name: d.label };
          }),
        );
        const song = p.songStorageId
          ? await (async () => {
              const meta = await ctx.db.system.get(p.songStorageId!);
              return [{ id: `${p._id}-song`, kind: "song", size: meta?.size ?? 0, at: meta?._creationTime ?? p.updatedAt, url: await ctx.storage.getUrl(p.songStorageId!), name: p.songName ?? "Your song" }];
            })()
          : [];
        const all = [...made, ...media, ...song];
        bytes += all.reduce((n, f) => n + f.size, 0);
        return { _id: p._id, names: p.names, slug: p.slug, status: p.status, files: all, words: { headline: p.headline ?? null, story: p.story ?? null, message: p.message ?? null } };
      }),
    );
    return { groups, bytes, count: groups.reduce((n, g) => n + g.files.length, 0) };
  },
});

/** Everything the customer has paid for, newest first. */
export const billing = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const projects = await ctx.db.query("projects").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    const rows: { id: string; what: string; amountKobo: number; method: string; status: string; at: number }[] = [];
    for (const p of projects) {
      const pays = await ctx.db.query("payments").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(20);
      for (const x of pays) rows.push({ id: x._id, what: p.names, amountKobo: x.amountKobo, method: x.method, status: x.status, at: x.confirmedAt ?? x.createdAt });
    }
    const packs = await ctx.db.query("packOrders").withIndex("by_user", (q) => q.eq("userId", user._id)).take(50);
    for (const o of packs) rows.push({ id: o._id, what: `${o.credits} credits`, amountKobo: o.amountKobo, method: "pack", status: o.status, at: o.confirmedAt ?? o.createdAt });
    return rows.sort((a, b) => b.at - a.at);
  },
});

export const prefs = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    return user ? { emailUpdates: !user.marketingOptOut } : null;
  },
});

export const setEmailUpdates = mutation({
  args: { on: v.boolean() },
  handler: async (ctx, { on }) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { marketingOptOut: !on });
  },
});

/** A copy of everything we hold about the customer, for them to download. */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const projects = await ctx.db.query("projects").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    const celebrations = await Promise.all(
      projects.map(async (p) => {
        const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(100);
        const wishes = await ctx.db.query("wishes").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(500);
        const payments = await ctx.db.query("payments").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(20);
        return {
          names: p.names, link: p.slug, occasion: p.occasion, status: p.status, eventDate: p.eventDate, eventTime: p.eventTime, venue: p.venue, dressCode: p.dressCode,
          headline: p.headline, story: p.story, message: p.message, giftBank: p.giftBank, giftAccountName: p.giftAccountName, giftAccountNumber: p.giftAccountNumber,
          createdAt: new Date(p.createdAt).toISOString(),
          files: await Promise.all(assets.map(async (a) => ({ kind: a.kind, bytes: a.size, url: await ctx.storage.getUrl(a.storageId) }))),
          finishedVideos: await Promise.all((p.deliverables ?? []).map(async (d) => ({ label: d.label, url: await ctx.storage.getUrl(d.storageId) }))),
          wishes: wishes.map((w) => ({ from: w.guestName, message: w.message, status: w.status, at: new Date(w.createdAt).toISOString() })),
          payments: payments.map((x) => ({ amountNaira: x.amountKobo / 100, method: x.method, status: x.status, at: new Date(x.createdAt).toISOString() })),
        };
      }),
    );
    return {
      exportedAt: new Date().toISOString(),
      account: { email: user.email, name: user.name, credits: user.credits ?? 0, makingFor: user.segment, heardFrom: user.heardFrom, cameFrom: user.source, emailUpdates: !user.marketingOptOut },
      celebrations,
    };
  },
});

/**
 * Delete the account and everything in it: celebrations, files, wishes, sign-in records.
 * Payment records stay, without the account, because tax law requires us to keep them.
 */
export const deleteAccount = mutation({
  args: { confirm: v.string() },
  handler: async (ctx, { confirm }) => {
    const user = await requireUser(ctx);
    if (!user.email || confirm.trim().toLowerCase() !== user.email.toLowerCase()) throw new ConvexError("Type your email address exactly to confirm.");

    const projects = await ctx.db.query("projects").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
    for (const p of projects) await wipeProject(ctx, p);

    const notes = await ctx.db.query("notes").withIndex("by_user", (q) => q.eq("userId", user._id)).take(200);
    for (const n of notes) await ctx.db.delete(n._id);

    const sessions = await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", user._id)).take(100);
    for (const s of sessions) {
      const tokens = await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).take(100);
      for (const t of tokens) await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }
    const accounts = await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", user._id)).take(20);
    for (const a of accounts) {
      const codes = await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).take(20);
      for (const c of codes) await ctx.db.delete(c._id);
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(user._id);
    await ctx.scheduler.runAfter(0, internal.account.purgeEvents, { userId: user._id });
  },
});

/** Activity history can be long, so it is cleared in batches after the account is gone. */
export const purgeEvents = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const batch = await ctx.db.query("events").withIndex("by_user", (q) => q.eq("userId", userId)).take(500);
    for (const e of batch) await ctx.db.delete(e._id);
    if (batch.length === 500) await ctx.scheduler.runAfter(0, internal.account.purgeEvents, { userId });
  },
});
