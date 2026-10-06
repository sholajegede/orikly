import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser, requireOwnedProject, requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { limit } from "./lib/limit";
import { PACKS } from "./lib/constants";
import { createJobs } from "./lib/jobs";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const orders = await ctx.db.query("packOrders").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(20);
    return { credits: user.credits ?? 0, orders };
  },
});

export const claim = mutation({
  args: { packId: v.string(), senderName: v.string(), reference: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx);
    await limit(ctx, `pack:${user._id}`, 5, 3_600_000);
    const pack = PACKS.find((p) => p.id === a.packId);
    if (!pack) throw new ConvexError("Pick a pack.");
    const senderName = a.senderName.trim().slice(0, 80);
    if (senderName.length < 2) throw new ConvexError("Enter the name on the account you paid from.");
    await ctx.db.insert("packOrders", {
      userId: user._id,
      packId: pack.id,
      credits: pack.credits,
      amountKobo: pack.priceKobo,
      status: "claimed",
      senderName,
      reference: a.reference?.trim().slice(0, 60) || undefined,
      createdAt: Date.now(),
    });
    await logEvent(ctx, { name: "pack_claimed", userId: user._id, props: { pack: pack.id } });
  },
});

/** Spend one credit to publish a celebration without paying again. */
export const useCredit = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const { user, project } = await requireOwnedProject(ctx, id);
    if (project.status === "paid") throw new ConvexError("This celebration is already live.");
    if (project.status === "suspended") throw new ConvexError("This site is suspended. Contact support.");
    if ((user.credits ?? 0) < 1) throw new ConvexError("You have no credits left.");
    const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", id)).take(40);
    if (assets.filter((a) => a.kind === "photo").length < 3) throw new ConvexError("Add at least 3 photos first.");
    const now = Date.now();
    await ctx.db.patch(user._id, { credits: (user.credits ?? 0) - 1 });
    await ctx.db.patch(id, { status: "paid", paidAt: now, updatedAt: now });
    await ctx.db.insert("payments", { projectId: id, ownerId: user._id, method: "credit", amountKobo: 0, status: "confirmed", note: "Pack credit", createdAt: now, confirmedAt: now });
    await createJobs(ctx, { ...project, status: "paid" });
    await logEvent(ctx, { name: "credit_used", userId: user._id, projectId: id });
  },
});
