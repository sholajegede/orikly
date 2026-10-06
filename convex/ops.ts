import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { logEvent } from "./lib/events";
import { bump } from "./lib/counters";

/** How many things are waiting on you. */
export const queues = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const count = async (q: Promise<unknown[]>) => (await q).length;
    return {
      applications: await count(ctx.db.query("creators").withIndex("by_status", (q) => q.eq("status", "pending")).take(100)),
      reviews: await count(ctx.db.query("jobs").withIndex("by_status", (q) => q.eq("status", "submitted")).take(100)),
      openJobs: await count(ctx.db.query("jobs").withIndex("by_status", (q) => q.eq("status", "open")).take(100)),
      payouts: await count(ctx.db.query("payouts").withIndex("by_status", (q) => q.eq("status", "requested")).take(100)),
      packs: await count(ctx.db.query("packOrders").withIndex("by_status", (q) => q.eq("status", "claimed")).take(100)),
    };
  },
});

export const creators = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const s = (status ?? "pending") as "pending" | "approved" | "suspended" | "rejected";
    const rows = await ctx.db.query("creators").withIndex("by_status", (q) => q.eq("status", s)).order("desc").take(100);
    return await Promise.all(rows.map(async (c) => ({ ...c, email: (await ctx.db.get(c.userId))?.email ?? null })));
  },
});

export const setCreatorStatus = mutation({
  args: { creatorId: v.id("creators"), status: v.union(v.literal("approved"), v.literal("suspended"), v.literal("rejected")) },
  handler: async (ctx, { creatorId, status }) => {
    const admin = await requireAdmin(ctx);
    const c = await ctx.db.get(creatorId);
    if (!c) throw new ConvexError("Creator not found.");
    await ctx.db.patch(creatorId, { status, approvedAt: status === "approved" ? (c.approvedAt ?? Date.now()) : c.approvedAt });
    await logEvent(ctx, { name: `creator_${status}`, userId: c.userId, props: { by: admin.email ?? "admin" } });
  },
});

export const reviews = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("jobs").withIndex("by_status", (q) => q.eq("status", "submitted")).order("asc").take(50);
    return await Promise.all(
      rows.map(async (j) => {
        const p = await ctx.db.get(j.projectId);
        const c = j.creatorId ? await ctx.db.get(j.creatorId) : null;
        return { ...j, names: p?.names ?? "", slug: p?.slug ?? "", creatorName: c?.displayName ?? "", videoUrl: j.storageId ? await ctx.storage.getUrl(j.storageId) : null };
      }),
    );
  },
});

export const approveJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const admin = await requireAdmin(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.status !== "submitted" || !job.storageId || !job.creatorId) throw new ConvexError("Nothing to approve here.");
    const project = await ctx.db.get(job.projectId);
    const creator = await ctx.db.get(job.creatorId);
    if (!project || !creator) throw new ConvexError("Project or creator missing.");
    const now = Date.now();
    await ctx.db.patch(jobId, { status: "approved", approvedAt: now });
    await ctx.db.patch(creator._id, { balanceKobo: creator.balanceKobo + job.payoutKobo, lifetimeKobo: creator.lifetimeKobo + job.payoutKobo, completed: creator.completed + 1 });
    await ctx.db.insert("ledger", { creatorId: creator._id, kind: "earning", amountKobo: job.payoutKobo, jobId, createdAt: now });
    const label = `${job.style} (${job.slot})`;
    await ctx.db.patch(project._id, { deliverables: [...(project.deliverables ?? []), { label, format: job.slot, storageId: job.storageId }], updatedAt: now });
    await bump(ctx, "videos_approved");
    await logEvent(ctx, { name: "video_delivered", userId: project.ownerId, projectId: project._id, props: { label, by: admin.email ?? "admin" } });
  },
});

export const requestChanges = mutation({
  args: { jobId: v.id("jobs"), note: v.string() },
  handler: async (ctx, { jobId, note }) => {
    await requireAdmin(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.status !== "submitted") throw new ConvexError("Nothing to review here.");
    const text = note.trim().slice(0, 500);
    if (text.length < 5) throw new ConvexError("Tell the creator what to change.");
    await ctx.db.patch(jobId, { status: "claimed", reviewNote: text, dueAt: Date.now() + 24 * 3_600_000 });
  },
});

export const payouts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("payouts").withIndex("by_status", (q) => q.eq("status", "requested")).order("asc").take(50);
    return await Promise.all(
      rows.map(async (p) => {
        const c = await ctx.db.get(p.creatorId);
        return { ...p, creatorName: c?.displayName ?? "", bankName: c?.bankName ?? "", accountNumber: c?.accountNumber ?? "", accountName: c?.accountName ?? "" };
      }),
    );
  },
});

export const markPayoutPaid = mutation({
  args: { payoutId: v.id("payouts"), reference: v.optional(v.string()) },
  handler: async (ctx, { payoutId, reference }) => {
    await requireAdmin(ctx);
    const p = await ctx.db.get(payoutId);
    if (!p || p.status !== "requested") throw new ConvexError("This payout is already handled.");
    await ctx.db.patch(payoutId, { status: "paid", resolvedAt: Date.now(), reference: reference?.trim().slice(0, 60) || undefined });
  },
});

export const rejectPayout = mutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, { payoutId }) => {
    await requireAdmin(ctx);
    const p = await ctx.db.get(payoutId);
    if (!p || p.status !== "requested") throw new ConvexError("This payout is already handled.");
    const c = await ctx.db.get(p.creatorId);
    if (!c) throw new ConvexError("Creator missing.");
    await ctx.db.patch(payoutId, { status: "rejected", resolvedAt: Date.now() });
    await ctx.db.patch(c._id, { balanceKobo: c.balanceKobo + p.amountKobo });
    await ctx.db.insert("ledger", { creatorId: c._id, kind: "payout_refund", amountKobo: p.amountKobo, payoutId, createdAt: Date.now() });
  },
});

export const packOrders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("packOrders").withIndex("by_status", (q) => q.eq("status", "claimed")).order("asc").take(50);
    return await Promise.all(rows.map(async (o) => ({ ...o, email: (await ctx.db.get(o.userId))?.email ?? null })));
  },
});

export const confirmPack = mutation({
  args: { orderId: v.id("packOrders") },
  handler: async (ctx, { orderId }) => {
    const admin = await requireAdmin(ctx);
    const o = await ctx.db.get(orderId);
    if (!o || o.status !== "claimed") throw new ConvexError("This order is already handled.");
    const user = await ctx.db.get(o.userId);
    if (!user) throw new ConvexError("Customer missing.");
    await ctx.db.patch(orderId, { status: "confirmed", confirmedAt: Date.now() });
    await ctx.db.patch(user._id, { credits: (user.credits ?? 0) + o.credits });
    await logEvent(ctx, { name: "pack_confirmed", userId: user._id, props: { pack: o.packId, by: admin.email ?? "admin" } });
  },
});

export const rejectPack = mutation({
  args: { orderId: v.id("packOrders") },
  handler: async (ctx, { orderId }) => {
    await requireAdmin(ctx);
    const o = await ctx.db.get(orderId);
    if (!o || o.status !== "claimed") throw new ConvexError("This order is already handled.");
    await ctx.db.patch(orderId, { status: "rejected" });
  },
});
