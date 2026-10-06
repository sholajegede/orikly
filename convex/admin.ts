import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { currentUser, isAdminEmail, requireAdmin } from "./lib/auth";
import { logEvent } from "./lib/events";
import { PROJECT_STATUSES } from "./lib/constants";
import { createJobs } from "./lib/jobs";
import { dayOf, lifetime, sumSince } from "./lib/counters";

const DAY = 86_400_000;

export const FUNNEL_STEPS = [
  "landing_view",
  "login_code_sent",
  "login_verified",
  "project_created",
  "upload_photo",
  "preview_viewed",
  "payment_claimed",
  "payment_confirmed",
] as const;

/** Used by the admin sign-in page so that only staff emails are ever sent a code. */
export const mayRequestCode = mutation({
  args: { email: v.string() },
  handler: async (_ctx, { email }) => isAdminEmail(email.trim().toLowerCase()),
});

export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    return isAdminEmail(user?.email);
  },
});

/** Counts for the Today and Funnel screens. Busy events come from sharded counters; the rest from event rows. */
export const overview = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdmin(ctx);
    const span = Math.min(Math.max(days ?? 30, 1), 365);
    const since = Date.now() - span * DAY;
    const sinceDay = dayOf(since);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const funnel: { step: string; people: number; events: number }[] = [];
    for (const step of FUNNEL_STEPS) {
      if (step === "landing_view") {
        const n = await sumSince(ctx, "ev:landing_view", sinceDay);
        funnel.push({ step, people: n, events: n });
        continue;
      }
      const rows = await ctx.db
        .query("events")
        .withIndex("by_name_time", (q) => q.eq("name", step).gte("at", since))
        .take(10_000);
      const keys = new Set(rows.map((r) => (r.userId ?? r.anonId ?? r._id) as string));
      funnel.push({ step, people: keys.size, events: rows.length });
    }

    const siteViews = await sumSince(ctx, "ev:site_view", sinceDay);
    const wishes = await sumSince(ctx, "ev:wish_sent", sinceDay);
    const footerClicks = await sumSince(ctx, "ev:footer_click", sinceDay);
    const customers = await lifetime(ctx, "customers");

    const byStatus: Record<string, number> = {};
    for (const s of PROJECT_STATUSES) {
      const rows = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", s))
        .take(2_000);
      byStatus[s] = rows.length;
    }

    const confirmed = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "confirmed"))
      .take(5_000);
    const packs = await ctx.db
      .query("packOrders")
      .withIndex("by_status", (q) => q.eq("status", "confirmed"))
      .take(2_000);
    const revenueKobo = confirmed.reduce((sum, p) => sum + p.amountKobo, 0) + packs.reduce((sum, p) => sum + p.amountKobo, 0);
    const revenueTodayKobo =
      confirmed.filter((p) => (p.confirmedAt ?? p.createdAt) >= todayStart.getTime()).reduce((sum, p) => sum + p.amountKobo, 0) +
      packs.filter((p) => (p.confirmedAt ?? p.createdAt) >= todayStart.getTime()).reduce((sum, p) => sum + p.amountKobo, 0);

    return {
      days: span,
      funnel,
      siteViews,
      wishes,
      footerClicks,
      byStatus,
      revenueKobo,
      revenueTodayKobo,
      customers,
    };
  },
});

export const projects = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const rows: Doc<"projects">[] = await ctx.db.query("projects").order("desc").take(100);
    const filtered = status ? rows.filter((p) => p.status === status) : rows;
    return await Promise.all(
      filtered.map(async (p) => {
        const owner = await ctx.db.get(p.ownerId);
        const assets = await ctx.db
          .query("assets")
          .withIndex("by_project", (q) => q.eq("projectId", p._id))
          .take(60);
        const siteViews = await lifetime(ctx, `proj:${p._id}:site_view`);
        const wishCount = await lifetime(ctx, `proj:${p._id}:wish_sent`);
        return {
          _id: p._id,
          names: p.names,
          slug: p.slug,
          occasion: p.occasion,
          status: p.status,
          createdAt: p.createdAt,
          paidAt: p.paidAt ?? null,
          ownerId: p.ownerId,
          ownerEmail: owner?.email ?? null,
          ownerWhatsapp: owner?.whatsapp ?? null,
          photos: assets.filter((a) => a.kind === "photo").length,
          videos: assets.filter((a) => a.kind === "video").length,
          siteViews,
          wishes: wishCount,
          videoStyles: p.videoStyles,
          siteStyle: p.siteStyle,
          songName: p.songName ?? p.songChoice ?? null,
          deliverables: (p.deliverables ?? []).length,
        };
      }),
    );
  },
});

/** Customer 360: everything we know about one person, in time order. */
export const customer = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    const payments = [];
    for (const p of projects) {
      const rows = await ctx.db
        .query("payments")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();
      payments.push(...rows);
    }
    return {
      user: {
        _id: user._id,
        email: user.email ?? null,
        name: user.name ?? null,
        whatsapp: user.whatsapp ?? null,
        source: user.source ?? null,
        firstSeenAt: user.firstSeenAt ?? user._creationTime,
        lastSeenAt: user.lastSeenAt ?? null,
      },
      projects: projects.map((p) => ({ _id: p._id, names: p.names, slug: p.slug, status: p.status, occasion: p.occasion })),
      payments,
      events,
      notes,
    };
  },
});

export const recentEvents = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("events").withIndex("by_time").order("desc").take(120);
  },
});

export const markPaid = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const admin = await requireAdmin(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new ConvexError("Project not found.");
    const now = Date.now();
    await ctx.db.patch(projectId, { status: "paid", paidAt: project.paidAt ?? now, updatedAt: now });

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    const claimed = payments.find((p) => p.status === "claimed");
    if (claimed) {
      await ctx.db.patch(claimed._id, { status: "confirmed", confirmedAt: now });
    } else if (!payments.some((p) => p.status === "confirmed")) {
      await ctx.db.insert("payments", {
        projectId,
        ownerId: project.ownerId,
        method: "transfer",
        amountKobo: 2_000_000,
        status: "confirmed",
        note: "Marked paid by admin",
        createdAt: now,
        confirmedAt: now,
      });
    }
    await createJobs(ctx, { ...project, status: "paid" });
    await logEvent(ctx, { name: "payment_confirmed", userId: project.ownerId, projectId, props: { by: admin.email ?? "admin" } });
  },
});

export const setProjectStatus = mutation({
  args: { projectId: v.id("projects"), action: v.union(v.literal("suspend"), v.literal("restore")) },
  handler: async (ctx, { projectId, action }) => {
    const admin = await requireAdmin(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new ConvexError("Project not found.");
    const status = action === "suspend" ? "suspended" : project.paidAt ? "paid" : "draft";
    await ctx.db.patch(projectId, { status, updatedAt: Date.now() });
    await logEvent(ctx, { name: `admin_${action}`, userId: project.ownerId, projectId, props: { by: admin.email ?? "admin" } });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Attach a finished video (made by us) to a customer's project. They can download it from their dashboard. */
export const attachDeliverable = mutation({
  args: { projectId: v.id("projects"), label: v.string(), format: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { projectId, label, format, storageId }) => {
    await requireAdmin(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new ConvexError("Project not found.");
    const meta = await ctx.db.system.get(storageId);
    if (!meta || !(meta.contentType ?? "").startsWith("video/")) {
      if (meta) await ctx.storage.delete(storageId);
      throw new ConvexError("Upload a video file.");
    }
    const list = [...(project.deliverables ?? []), { label: label.trim().slice(0, 60), format: format.trim().slice(0, 20), storageId }];
    await ctx.db.patch(projectId, { deliverables: list, updatedAt: Date.now() });
    const slot = format.trim().toLowerCase();
    const jobs = await ctx.db.query("jobs").withIndex("by_project", (q) => q.eq("projectId", projectId)).take(4);
    const open = jobs.find((j) => j.slot === slot && j.status === "open");
    if (open) await ctx.db.patch(open._id, { status: "cancelled" });
    await logEvent(ctx, { name: "video_delivered", userId: project.ownerId, projectId, props: { label, format } });
  },
});

export const removeDeliverable = mutation({
  args: { projectId: v.id("projects"), index: v.number() },
  handler: async (ctx, { projectId, index }) => {
    await requireAdmin(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) return;
    const list = [...(project.deliverables ?? [])];
    const [gone] = list.splice(index, 1);
    if (gone) await ctx.storage.delete(gone.storageId);
    await ctx.db.patch(projectId, { deliverables: list, updatedAt: Date.now() });
  },
});

export const addNote = mutation({
  args: { userId: v.id("users"), body: v.string(), tag: v.optional(v.string()) },
  handler: async (ctx, { userId, body, tag }) => {
    const admin = await requireAdmin(ctx);
    const text = body.trim().slice(0, 1000);
    if (!text) return;
    await ctx.db.insert("notes", { userId, body: text, tag: tag?.trim().slice(0, 30) || undefined, authorEmail: admin.email, createdAt: Date.now() });
  },
});

export const projectDetail = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    await requireAdmin(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) return null;
    const owner = await ctx.db.get(project.ownerId);
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    const wishes = await ctx.db
      .query("wishes")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .take(200);
    const deliverables = await Promise.all(
      (project.deliverables ?? []).map(async (d, index) => ({ ...d, index, url: await ctx.storage.getUrl(d.storageId) })),
    );
    const songUrl = project.songStorageId ? await ctx.storage.getUrl(project.songStorageId) : null;
    const photoUrls = await Promise.all(
      assets.filter((a) => a.kind === "photo").sort((a, b) => a.order - b.order).map(async (a) => ({ id: a._id, url: await ctx.storage.getUrl(a.storageId) })),
    );
    const videoUrls = await Promise.all(
      assets.filter((a) => a.kind === "video").map(async (a) => ({ id: a._id, url: await ctx.storage.getUrl(a.storageId) })),
    );
    return {
      project,
      ownerEmail: owner?.email ?? null,
      ownerWhatsapp: owner?.whatsapp ?? null,
      photoUrls,
      videoUrls,
      payments,
      wishCount: wishes.length,
      deliverables,
      songUrl,
    };
  },
});
