import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUser, isAdminEmail, requireOwnedProject, requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { lifetime } from "./lib/counters";
import {
  MAX_PROJECTS_PER_USER,
  PALETTES,
  PRICE_KOBO,
  SITE_STYLES,
  SONG_LIBRARY,
  VIDEO_STYLES,
  normalizeSlug,
  slugProblem,
} from "./lib/constants";

const occasionV = v.union(v.literal("wedding"), v.literal("birthday"), v.literal("anniversary"));

async function slugOwner(ctx: QueryCtx, slug: string) {
  return await ctx.db
    .query("projects")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
}

async function assetUrl(ctx: QueryCtx, id: Id<"assets"> | undefined) {
  if (!id) return null;
  const a = await ctx.db.get(id);
  return a ? await ctx.storage.getUrl(a.storageId) : null;
}

export const checkSlug = query({
  args: { slug: v.string(), projectId: v.optional(v.id("projects")) },
  handler: async (ctx, { slug, projectId }) => {
    const s = normalizeSlug(slug);
    const problem = slugProblem(s);
    if (problem) return { ok: false, slug: s, reason: problem as string | null, suggestions: [] as string[] };
    const existing = await slugOwner(ctx, s);
    if (existing && existing._id !== projectId) {
      const year = new Date().getFullYear();
      const free: string[] = [];
      for (const c of [`${s}-${year}`, `${s}-forever`, `${s}-1`].map(normalizeSlug)) {
        if (slugProblem(c)) continue;
        if (!(await slugOwner(ctx, c))) free.push(c);
      }
      return { ok: false, slug: s, reason: "That link is already taken." as string | null, suggestions: free };
    }
    return { ok: true, slug: s, reason: null as string | null, suggestions: [] as string[] };
  },
});

export const create = mutation({
  args: { occasion: occasionV, names: v.string(), slug: v.string(), eventDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const names = args.names.trim();
    if (names.length < 2 || names.length > 60) throw new ConvexError("Enter the name or names (2 to 60 characters).");
    const slug = normalizeSlug(args.slug);
    const problem = slugProblem(slug);
    if (problem) throw new ConvexError(problem);
    if (await slugOwner(ctx, slug)) throw new ConvexError("That link is already taken.");
    const mine = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    if (mine.length >= MAX_PROJECTS_PER_USER) throw new ConvexError("You have reached the limit of 5 celebrations. Contact support.");
    if (args.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(args.eventDate)) throw new ConvexError("Use a valid date.");

    const now = Date.now();
    const id = await ctx.db.insert("projects", {
      ownerId: user._id,
      occasion: args.occasion,
      slug,
      status: "draft",
      names,
      eventDate: args.eventDate || undefined,
      wishesOn: true,
      siteStyle: "editorial",
      palette: "lilac",
      videoStyles: ["cinematic", "reel"],
      createdAt: now,
      updatedAt: now,
    });
    await logEvent(ctx, { name: "project_created", userId: user._id, projectId: id, props: { occasion: args.occasion } });
    return id;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      projects.map(async (p) => {
        const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(60);
        const wishes = await ctx.db.query("wishes").withIndex("by_project", (q) => q.eq("projectId", p._id)).take(200);
        return {
          _id: p._id,
          names: p.names,
          slug: p.slug,
          occasion: p.occasion,
          status: p.status,
          createdAt: p.createdAt,
          eventDate: p.eventDate ?? null,
          coverUrl: await assetUrl(ctx, p.coverAssetId),
          photos: assets.filter((a) => a.kind === "photo").length,
          views: await lifetime(ctx, `proj:${p._id}:site_view`),
          wishes: wishes.filter((w) => w.status === "approved").length,
          wishesWaiting: wishes.filter((w) => w.status === "pending").length,
          videos: (p.deliverables ?? []).length,
          directed: !!p.videoPlan,
        };
      }),
    );
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const project = await ctx.db.get(id);
    if (!project || project.ownerId !== user._id) return null;

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    const assetsWithUrls = await Promise.all(
      assets.map(async (a) => ({ ...a, url: await ctx.storage.getUrl(a.storageId) })),
    );
    const wishes = await ctx.db
      .query("wishes")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .order("desc")
      .take(200);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    const deliverables =
      project.status === "paid"
        ? await Promise.all(
            (project.deliverables ?? []).map(async (d) => ({ ...d, url: await ctx.storage.getUrl(d.storageId) })),
          )
        : [];
    const songUrl = project.songStorageId ? await ctx.storage.getUrl(project.songStorageId) : null;
    return { project, assets: assetsWithUrls, wishes, payments, deliverables, songUrl };
  },
});

const clip = (s: string | undefined, max: number) => (s === undefined ? undefined : s.trim().slice(0, max));

export const update = mutation({
  args: {
    id: v.id("projects"),
    patch: v.object({
      names: v.optional(v.string()),
      slug: v.optional(v.string()),
      eventDate: v.optional(v.string()),
      headline: v.optional(v.string()),
      story: v.optional(v.string()),
      message: v.optional(v.string()),
      wishesOn: v.optional(v.boolean()),
      showOnWall: v.optional(v.boolean()),
      venue: v.optional(v.string()),
      eventTime: v.optional(v.string()),
      dressCode: v.optional(v.string()),
      mapUrl: v.optional(v.string()),
      giftBank: v.optional(v.string()),
      giftAccountName: v.optional(v.string()),
      giftAccountNumber: v.optional(v.string()),
      siteStyle: v.optional(v.string()),
      palette: v.optional(v.string()),
      videoStyles: v.optional(v.array(v.string())),
      songChoice: v.optional(v.string()),
      coverAssetId: v.optional(v.id("assets")),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    const { project } = await requireOwnedProject(ctx, id);
    if (project.status === "suspended") throw new ConvexError("This site is suspended. Contact support.");

    const next: Partial<Doc<"projects">> = {};

    if (patch.names !== undefined) {
      const n = clip(patch.names, 60)!;
      if (n.length < 2) throw new ConvexError("Enter the name or names.");
      next.names = n;
    }
    if (patch.slug !== undefined) {
      if (project.status === "paid") throw new ConvexError("The link cannot change after payment. Contact support.");
      const s = normalizeSlug(patch.slug);
      const problem = slugProblem(s);
      if (problem) throw new ConvexError(problem);
      const other = await slugOwner(ctx, s);
      if (other && other._id !== id) throw new ConvexError("That link is already taken.");
      next.slug = s;
    }
    if (patch.eventDate !== undefined) {
      if (patch.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(patch.eventDate)) throw new ConvexError("Use a valid date.");
      next.eventDate = patch.eventDate || undefined;
    }
    if (patch.headline !== undefined) next.headline = clip(patch.headline, 120) || undefined;
    if (patch.story !== undefined) next.story = clip(patch.story, 2000) || undefined;
    if (patch.message !== undefined) next.message = clip(patch.message, 4000) || undefined;
    if (patch.wishesOn !== undefined) next.wishesOn = patch.wishesOn;
    if (patch.showOnWall !== undefined) next.showOnWall = patch.showOnWall;
    if (patch.venue !== undefined) next.venue = clip(patch.venue, 140) || undefined;
    if (patch.eventTime !== undefined) {
      if (patch.eventTime && !/^\d{2}:\d{2}$/.test(patch.eventTime)) throw new ConvexError("Use a valid time.");
      next.eventTime = patch.eventTime || undefined;
    }
    if (patch.dressCode !== undefined) next.dressCode = clip(patch.dressCode, 80) || undefined;
    if (patch.mapUrl !== undefined) {
      const m = clip(patch.mapUrl, 300) || "";
      if (m && !/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.apple\.com)\//i.test(m)) {
        throw new ConvexError("Paste a Google Maps or Apple Maps link.");
      }
      next.mapUrl = m || undefined;
    }
    if (patch.giftBank !== undefined) next.giftBank = clip(patch.giftBank, 60) || undefined;
    if (patch.giftAccountName !== undefined) next.giftAccountName = clip(patch.giftAccountName, 80) || undefined;
    if (patch.giftAccountNumber !== undefined) {
      const n = patch.giftAccountNumber.replace(/\D/g, "");
      if (n && n.length !== 10) throw new ConvexError("An account number has 10 digits.");
      next.giftAccountNumber = n || undefined;
    }
    if (patch.siteStyle !== undefined) {
      if (!SITE_STYLES.some((s) => s.id === patch.siteStyle)) throw new ConvexError("Unknown style.");
      next.siteStyle = patch.siteStyle;
    }
    if (patch.palette !== undefined) {
      if (!PALETTES.some((p) => p.id === patch.palette)) throw new ConvexError("Unknown color scheme.");
      next.palette = patch.palette;
    }
    if (patch.videoStyles !== undefined) {
      const ok = patch.videoStyles.length === 2 && new Set(patch.videoStyles).size === 2 &&
        patch.videoStyles.every((s) => VIDEO_STYLES.some((x) => x.id === s));
      if (!ok) throw new ConvexError("Pick exactly two different video styles.");
      next.videoStyles = patch.videoStyles;
    }
    if (patch.songChoice !== undefined) {
      if (patch.songChoice && !SONG_LIBRARY.some((s) => s.id === patch.songChoice)) throw new ConvexError("Unknown song.");
      next.songChoice = patch.songChoice || undefined;
    }
    if (patch.coverAssetId !== undefined) {
      const a = await ctx.db.get(patch.coverAssetId);
      if (!a || a.projectId !== id || a.kind !== "photo") throw new ConvexError("Pick one of your photos.");
      next.coverAssetId = patch.coverAssetId;
    }

    await ctx.db.patch(id, { ...next, updatedAt: Date.now() });
  },
});

/** Customer says they paid by bank transfer. Admin confirms in the admin app. */
export const claimTransfer = mutation({
  args: { id: v.id("projects"), senderName: v.string(), reference: v.optional(v.string()) },
  handler: async (ctx, { id, senderName, reference }) => {
    const { user, project } = await requireOwnedProject(ctx, id);
    if (project.status === "paid") throw new ConvexError("This celebration is already paid.");
    if (project.status === "suspended") throw new ConvexError("This site is suspended. Contact support.");
    const sender = senderName.trim().slice(0, 80);
    if (sender.length < 2) throw new ConvexError("Enter the name on the account you paid from.");

    const photos = await ctx.db
      .query("assets")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    if (photos.filter((a) => a.kind === "photo").length < 3) throw new ConvexError("Add at least 3 photos first.");

    await ctx.db.insert("payments", {
      projectId: id,
      ownerId: user._id,
      method: "transfer",
      amountKobo: PRICE_KOBO,
      status: "claimed",
      senderName: sender,
      reference: reference?.trim().slice(0, 60) || undefined,
      createdAt: Date.now(),
    });
    await ctx.db.patch(id, { status: "payment_claimed", updatedAt: Date.now() });
    await logEvent(ctx, { name: "payment_claimed", userId: user._id, projectId: id, props: { method: "transfer" } });
  },
});

/** The public wall: live celebrations whose owners chose to show them. Newest first. */
export const wall = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit: n }) => {
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_wall", (q) => q.eq("showOnWall", true))
      .order("desc")
      .take(Math.min(Math.max(n ?? 24, 1), 48));
    const live = rows.filter((p) => p.status === "paid");
    return await Promise.all(
      live.map(async (p) => ({ slug: p.slug, names: p.names, occasion: p.occasion, palette: p.palette, coverUrl: await assetUrl(ctx, p.coverAssetId) })),
    );
  },
});

const MAX_INSTANT_BYTES = 150 * 1024 * 1024;

/** Save a video the customer just made in their browser. One per shape; making it again replaces it. */
export const addInstantVideo = mutation({
  args: { id: v.id("projects"), storageId: v.id("_storage"), format: v.union(v.literal("portrait"), v.literal("landscape")) },
  handler: async (ctx, { id, storageId, format }) => {
    const { user, project } = await requireOwnedProject(ctx, id);
    const meta = await ctx.db.system.get(storageId);
    const fail = async (msg: string) => {
      if (meta) await ctx.storage.delete(storageId);
      throw new ConvexError(msg);
    };
    if (project.status !== "paid") await fail("Your videos are saved once your celebration is live.");
    if (!meta || !(meta.contentType ?? "").startsWith("video/")) await fail("That file is not a video.");
    if (meta!.size > MAX_INSTANT_BYTES) await fail("That video is too large.");

    const label = format === "portrait" ? "Instant video, tall" : "Instant video, wide";
    const list = [...(project.deliverables ?? [])];
    const at = list.findIndex((d) => d.label === label);
    if (at >= 0) {
      await ctx.storage.delete(list[at].storageId);
      list.splice(at, 1);
    }
    list.unshift({ label, format, storageId });
    await ctx.db.patch(id, { deliverables: list, updatedAt: Date.now() });
    await logEvent(ctx, { name: "video_instant", userId: user._id, projectId: id, props: { format } });
  },
});

/** What a visitor (or the owner, before payment) sees on the public site. */
export const publicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const project = await slugOwner(ctx, normalizeSlug(slug));
    if (!project || project.status === "suspended") return null;
    const user = await currentUser(ctx);
    const isOwner = !!user && (user._id === project.ownerId || isAdminEmail(user.email));
    const live = project.status === "paid";
    if (!live && !isOwner) return null;

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const withUrls = await Promise.all(
      assets.map(async (a) => ({ id: a._id, kind: a.kind, width: a.width ?? null, height: a.height ?? null, url: await ctx.storage.getUrl(a.storageId) })),
    );
    const cover = project.coverAssetId ? withUrls.find((a) => a.id === project.coverAssetId) : undefined;
    const photos = withUrls.filter((a) => a.kind === "photo" && a.url);
    const videos = withUrls.filter((a) => a.kind === "video" && a.url);

    const wishRows = project.wishesOn
      ? await ctx.db
          .query("wishes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .order("desc")
          .take(100)
      : [];
    const wishes = wishRows
      .filter((w) => w.status === "approved")
      .map((w) => ({ guestName: w.guestName, message: w.message, createdAt: w.createdAt }));

    const first = (project.deliverables ?? [])[0];
    const featuredVideoUrl = live && first ? await ctx.storage.getUrl(first.storageId) : null;

    return {
      live,
      isOwner,
      site: {
        slug: project.slug,
        occasion: project.occasion,
        names: project.names,
        eventDate: project.eventDate ?? null,
        headline: project.headline ?? null,
        story: project.story ?? null,
        message: project.message ?? null,
        wishesOn: project.wishesOn,
        venue: project.venue ?? null,
        eventTime: project.eventTime ?? null,
        dressCode: project.dressCode ?? null,
        mapUrl: project.mapUrl ?? null,
        gift: project.giftBank && project.giftAccountNumber && project.giftAccountName
          ? { bank: project.giftBank, name: project.giftAccountName, number: project.giftAccountNumber }
          : null,
        siteStyle: project.siteStyle,
        palette: project.palette,
      },
      coverUrl: cover?.url ?? photos[0]?.url ?? null,
      photos: photos.map((p) => ({ url: p.url as string, width: p.width, height: p.height })),
      videos: videos.map((p) => ({ url: p.url as string })),
      wishes,
      featuredVideoUrl,
    };
  },
});
