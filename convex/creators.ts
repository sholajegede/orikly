import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { limit } from "./lib/limit";
import { CREATOR_MAX_ACTIVE, JOB_CLAIM_HOURS, MAX_DELIVERABLE_BYTES, MIN_PAYOUT_KOBO } from "./lib/constants";
import { bump } from "./lib/counters";

async function myCreator(ctx: Parameters<typeof requireUser>[0]) {
  const user = await requireUser(ctx);
  const creator = await ctx.db.query("creators").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
  return { user, creator };
}

async function approvedCreator(ctx: Parameters<typeof requireUser>[0]) {
  const { user, creator } = await myCreator(ctx);
  if (!creator || creator.status !== "approved") throw new ConvexError("Your creator account is not approved yet.");
  return { user, creator };
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { creator } = await myCreator(ctx).catch(() => ({ creator: null }));
    if (!creator) return null;
    const open = await ctx.db.query("payouts").withIndex("by_creator", (q) => q.eq("creatorId", creator._id)).order("desc").take(20);
    return { creator, payouts: open };
  },
});

export const apply = mutation({
  args: {
    displayName: v.string(),
    whatsapp: v.string(),
    city: v.string(),
    portfolioUrl: v.optional(v.string()),
    experience: v.string(),
  },
  handler: async (ctx, a) => {
    const { user, creator } = await myCreator(ctx);
    if (creator) throw new ConvexError("You have already applied.");
    await limit(ctx, `apply:${user._id}`, 3, 3_600_000);
    const displayName = a.displayName.trim().slice(0, 60);
    const whatsapp = a.whatsapp.replace(/[^\d+]/g, "").slice(0, 20);
    const city = a.city.trim().slice(0, 60);
    const experience = a.experience.trim().slice(0, 600);
    if (displayName.length < 2) throw new ConvexError("Enter the name you work under.");
    if (whatsapp.length < 10) throw new ConvexError("Enter a WhatsApp number we can reach you on.");
    if (!city) throw new ConvexError("Enter your city.");
    if (experience.length < 20) throw new ConvexError("Tell us a little about the videos you make (at least 20 characters).");
    let portfolioUrl = a.portfolioUrl?.trim().slice(0, 200) || undefined;
    if (portfolioUrl && !/^https?:\/\//i.test(portfolioUrl)) portfolioUrl = `https://${portfolioUrl}`;
    await ctx.db.insert("creators", {
      userId: user._id,
      displayName,
      whatsapp,
      city,
      portfolioUrl,
      experience,
      status: "pending",
      balanceKobo: 0,
      lifetimeKobo: 0,
      completed: 0,
      createdAt: Date.now(),
    });
    await logEvent(ctx, { name: "creator_applied", userId: user._id });
  },
});

export const saveBank = mutation({
  args: { bankName: v.string(), accountNumber: v.string(), accountName: v.string() },
  handler: async (ctx, a) => {
    const { creator } = await approvedCreator(ctx);
    const accountNumber = a.accountNumber.replace(/\D/g, "");
    if (accountNumber.length !== 10) throw new ConvexError("An account number has 10 digits.");
    if (a.bankName.trim().length < 2 || a.accountName.trim().length < 2) throw new ConvexError("Fill in the bank and the account name.");
    await ctx.db.patch(creator._id, { bankName: a.bankName.trim().slice(0, 60), accountNumber, accountName: a.accountName.trim().slice(0, 80) });
  },
});

/** Open jobs. No customer names or photos are shown until a creator claims one. */
export const openJobs = query({
  args: {},
  handler: async (ctx) => {
    const { creator } = await myCreator(ctx).catch(() => ({ creator: null }));
    if (!creator || creator.status !== "approved") return [];
    const rows = await ctx.db.query("jobs").withIndex("by_status", (q) => q.eq("status", "open")).order("asc").take(40);
    return await Promise.all(
      rows.map(async (j) => {
        const p = await ctx.db.get(j.projectId);
        const photos = p
          ? (await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(40)).filter((a) => a.kind === "photo").length
          : 0;
        return { _id: j._id, slot: j.slot, style: j.style, payoutKobo: j.payoutKobo, createdAt: j.createdAt, occasion: p?.occasion ?? "wedding", photos, hasSong: !!(p?.songStorageId || p?.songChoice) };
      }),
    );
  },
});

export const myJobs = query({
  args: {},
  handler: async (ctx) => {
    const { creator } = await myCreator(ctx).catch(() => ({ creator: null }));
    if (!creator) return [];
    const out: Doc<"jobs">[] = [];
    for (const status of ["claimed", "submitted", "approved"] as const) {
      const rows = await ctx.db
        .query("jobs")
        .withIndex("by_creator", (q) => q.eq("creatorId", creator._id).eq("status", status))
        .order("desc")
        .take(status === "approved" ? 15 : 10);
      out.push(...rows);
    }
    return await Promise.all(
      out.map(async (j) => {
        const p = await ctx.db.get(j.projectId);
        return { ...j, names: p?.names ?? "", occasion: p?.occasion ?? "wedding" };
      }),
    );
  },
});

export const ledger = query({
  args: {},
  handler: async (ctx) => {
    const { creator } = await myCreator(ctx).catch(() => ({ creator: null }));
    if (!creator) return [];
    return await ctx.db.query("ledger").withIndex("by_creator", (q) => q.eq("creatorId", creator._id)).order("desc").take(50);
  },
});

export const claim = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const { creator } = await approvedCreator(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.status !== "open") throw new ConvexError("Someone else just took this job.");
    const active = await ctx.db.query("jobs").withIndex("by_creator", (q) => q.eq("creatorId", creator._id).eq("status", "claimed")).take(CREATOR_MAX_ACTIVE + 1);
    if (active.length >= CREATOR_MAX_ACTIVE) throw new ConvexError(`You can hold ${CREATOR_MAX_ACTIVE} jobs at a time. Finish one first.`);
    const now = Date.now();
    await ctx.db.patch(jobId, { status: "claimed", creatorId: creator._id, claimedAt: now, dueAt: now + JOB_CLAIM_HOURS * 3_600_000, reviewNote: undefined });
    await logEvent(ctx, { name: "job_claimed", userId: creator.userId, projectId: job.projectId, props: { slot: job.slot } });
  },
});

export const release = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const { creator } = await approvedCreator(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.creatorId !== creator._id || job.status !== "claimed") throw new ConvexError("This job is not yours to release.");
    await ctx.db.patch(jobId, { status: "open", creatorId: undefined, claimedAt: undefined, dueAt: undefined });
  },
});

/** Everything needed to make the video. Only the creator who holds the job can read it. */
export const brief = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const { creator } = await myCreator(ctx).catch(() => ({ creator: null }));
    if (!creator || creator.status !== "approved") return null;
    const job = await ctx.db.get(jobId);
    if (!job || job.creatorId !== creator._id) return null;
    const p = await ctx.db.get(job.projectId);
    if (!p) return null;
    const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(40);
    const photos = await Promise.all(assets.filter((a) => a.kind === "photo").sort((a, b) => a.order - b.order).map(async (a) => await ctx.storage.getUrl(a.storageId)));
    const videos = await Promise.all(assets.filter((a) => a.kind === "video").map(async (a) => await ctx.storage.getUrl(a.storageId)));
    const songUrl = p.songStorageId ? await ctx.storage.getUrl(p.songStorageId) : null;
    return {
      job,
      names: p.names,
      occasion: p.occasion,
      eventDate: p.eventDate ?? null,
      headline: p.headline ?? null,
      story: p.story ?? null,
      message: p.message ?? null,
      songName: p.songName ?? p.songChoice ?? null,
      songUrl,
      photos: photos.filter((u): u is string => !!u),
      videos: videos.filter((u): u is string => !!u),
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const { creator } = await approvedCreator(ctx);
    await limit(ctx, `cupload:${creator._id}`, 20, 3_600_000);
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: { jobId: v.id("jobs"), storageId: v.id("_storage") },
  handler: async (ctx, { jobId, storageId }) => {
    const { creator } = await approvedCreator(ctx);
    const job = await ctx.db.get(jobId);
    if (!job || job.creatorId !== creator._id || job.status !== "claimed") {
      await ctx.storage.delete(storageId);
      throw new ConvexError("This job is not open for upload.");
    }
    const meta = await ctx.db.system.get(storageId);
    if (!meta || !(meta.contentType ?? "").startsWith("video/")) {
      if (meta) await ctx.storage.delete(storageId);
      throw new ConvexError("Upload a video file (mp4 or mov).");
    }
    if (meta.size > MAX_DELIVERABLE_BYTES) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("The video is over 200 MB. Export it smaller.");
    }
    if (job.storageId) await ctx.storage.delete(job.storageId);
    await ctx.db.patch(jobId, { status: "submitted", storageId, submittedAt: Date.now(), reviewNote: undefined });
    await logEvent(ctx, { name: "job_submitted", userId: creator.userId, projectId: job.projectId, props: { slot: job.slot } });
  },
});

export const requestPayout = mutation({
  args: {},
  handler: async (ctx) => {
    const { creator } = await approvedCreator(ctx);
    await limit(ctx, `payout:${creator._id}`, 3, 3_600_000);
    if (!creator.bankName || !creator.accountNumber || !creator.accountName) throw new ConvexError("Add your bank details first.");
    if (creator.balanceKobo < MIN_PAYOUT_KOBO) throw new ConvexError("The smallest payout is ₦5,000.");
    const pending = await ctx.db.query("payouts").withIndex("by_creator", (q) => q.eq("creatorId", creator._id)).order("desc").take(5);
    if (pending.some((p) => p.status === "requested")) throw new ConvexError("You already have a payout waiting.");
    const now = Date.now();
    const payoutId = await ctx.db.insert("payouts", { creatorId: creator._id, amountKobo: creator.balanceKobo, status: "requested", requestedAt: now });
    await ctx.db.insert("ledger", { creatorId: creator._id, kind: "payout", amountKobo: -creator.balanceKobo, payoutId, createdAt: now });
    await ctx.db.patch(creator._id, { balanceKobo: 0 });
    await bump(ctx, "payouts_requested");
    await logEvent(ctx, { name: "payout_requested", userId: creator.userId });
  },
});
