import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser, requireOwnedProject, requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { startStudio } from "./studio";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const orders = await ctx.db.query("packOrders").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(20);
    return { credits: user.credits ?? 0, orders };
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
    await logEvent(ctx, { name: "credit_used", userId: user._id, projectId: id });
    await startStudio(ctx, id);
  },
});
