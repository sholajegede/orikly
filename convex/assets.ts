import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireOwnedProject, requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_SONG_BYTES, MAX_VIDEOS, MAX_VIDEO_BYTES } from "./lib/constants";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("photo"), v.literal("video")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user, project } = await requireOwnedProject(ctx, args.projectId);
    const meta = await ctx.db.system.get(args.storageId);
    if (!meta) throw new ConvexError("Upload not found. Try again.");

    const contentType = meta.contentType ?? "";
    const typeOk = args.kind === "photo" ? contentType.startsWith("image/") : contentType.startsWith("video/");
    const maxBytes = args.kind === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
    const maxCount = args.kind === "photo" ? MAX_PHOTOS : MAX_VIDEOS;

    const existing = await ctx.db
      .query("assets")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const sameKind = existing.filter((a) => a.kind === args.kind);

    let problem: string | null = null;
    if (!typeOk) problem = args.kind === "photo" ? "That file is not a photo." : "That file is not a video.";
    else if (meta.size > maxBytes) problem = `That file is too large (limit ${Math.round(maxBytes / 1024 / 1024)} MB).`;
    else if (sameKind.length >= maxCount) problem = `You can add up to ${maxCount} ${args.kind}s.`;
    if (problem) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(problem);
    }

    const order = existing.length ? Math.max(...existing.map((a) => a.order)) + 1 : 0;
    const id = await ctx.db.insert("assets", {
      projectId: args.projectId,
      ownerId: user._id,
      kind: args.kind,
      storageId: args.storageId,
      order,
      size: meta.size,
      width: args.width,
      height: args.height,
      createdAt: Date.now(),
    });
    if (args.kind === "photo" && !project.coverAssetId) {
      await ctx.db.patch(project._id, { coverAssetId: id, updatedAt: Date.now() });
    }
    await logEvent(ctx, {
      name: args.kind === "photo" ? "upload_photo" : "upload_video",
      userId: user._id,
      projectId: project._id,
      props: { bytes: meta.size },
    });
    return id;
  },
});

export const remove = mutation({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset) return;
    const { project } = await requireOwnedProject(ctx, asset.projectId);
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(assetId);
    if (project.coverAssetId === assetId) {
      const rest = await ctx.db
        .query("assets")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      const nextCover = rest.find((a) => a.kind === "photo");
      await ctx.db.patch(project._id, { coverAssetId: nextCover?._id, updatedAt: Date.now() });
    }
  },
});

export const reorder = mutation({
  args: { projectId: v.id("projects"), orderedIds: v.array(v.id("assets")) },
  handler: async (ctx, { projectId, orderedIds }) => {
    await requireOwnedProject(ctx, projectId);
    for (let i = 0; i < orderedIds.length; i++) {
      const a = await ctx.db.get(orderedIds[i]);
      if (a && a.projectId === projectId) await ctx.db.patch(a._id, { order: i });
    }
  },
});

export const setSong = mutation({
  args: { projectId: v.id("projects"), storageId: v.id("_storage"), name: v.string() },
  handler: async (ctx, { projectId, storageId, name }) => {
    const { user, project } = await requireOwnedProject(ctx, projectId);
    const meta = await ctx.db.system.get(storageId);
    if (!meta) throw new ConvexError("Upload not found. Try again.");
    if (!(meta.contentType ?? "").startsWith("audio/") || meta.size > MAX_SONG_BYTES) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Upload an audio file under 15 MB.");
    }
    if (project.songStorageId) await ctx.storage.delete(project.songStorageId);
    await ctx.db.patch(projectId, {
      songStorageId: storageId,
      songName: name.trim().slice(0, 100),
      songChoice: undefined,
      updatedAt: Date.now(),
    });
    await logEvent(ctx, { name: "song_uploaded", userId: user._id, projectId });
  },
});

export const clearSong = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const { project } = await requireOwnedProject(ctx, projectId);
    if (project.songStorageId) await ctx.storage.delete(project.songStorageId);
    await ctx.db.patch(projectId, { songStorageId: undefined, songName: undefined, updatedAt: Date.now() });
  },
});
