import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { currentUser, requireOwnedProject } from "./lib/auth";
import { logEvent } from "./lib/events";
import { limit } from "./lib/limit";
import { COST, MIN_LETTERS } from "./lib/constants";
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

/** Take credits from a customer for something made for one celebration, and keep a line of it for their history. */
export async function spend(ctx: MutationCtx, userId: Id<"users">, projectId: Id<"projects">, credits: number, what: string) {
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("Account not found.");
  const have = user.credits ?? 0;
  if (have < credits) throw new ConvexError(`That needs ${credits} credits and you have ${have}. Buy more to carry on.`);
  const now = Date.now();
  await ctx.db.patch(userId, { credits: have - credits });
  await ctx.db.insert("payments", { projectId, ownerId: userId, method: "credit", amountKobo: 0, status: "confirmed", note: `${what} · ${credits} credits`, createdAt: now, confirmedAt: now });
}

/** Publish a draft with credits the customer already holds: the website, and the two films if they want them. */
export async function publishWithCredits(ctx: MutationCtx, userId: Id<"users">, projectId: Id<"projects">, films: boolean, letters = false) {
  const project = await ctx.db.get(projectId);
  if (!project || project.ownerId !== userId) throw new ConvexError("Celebration not found.");
  if (project.status === "paid") throw new ConvexError("This celebration is already live.");
  if (project.status === "suspended") throw new ConvexError("This site is suspended. Contact support.");
  const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", projectId)).take(40);
  if (assets.filter((a) => a.kind === "photo").length < 3) throw new ConvexError("Add at least 3 photos first.");
  const withLetters = letters && (project.letters ?? []).filter((l) => l.when.trim() && l.text.trim()).length >= MIN_LETTERS;
  const need = COST.site + (films ? COST.film * 2 : 0) + (withLetters ? COST.letters : 0);
  await spend(ctx, userId, projectId, need, [films ? "Website and two films" : "Website", withLetters ? "Open when letters" : ""].filter(Boolean).join(", "));
  const now = Date.now();
  await ctx.db.patch(projectId, { status: "paid", paidAt: now, updatedAt: now, ...(withLetters ? { lettersOn: true } : {}) });
  await logEvent(ctx, { name: "published", userId, projectId, props: { credits: need, films, letters: withLetters } });
  await startStudio(ctx, projectId, { design: true, films, letters: withLetters, charged: need });
}

export const publish = mutation({
  args: { id: v.id("projects"), films: v.boolean(), letters: v.optional(v.boolean()) },
  handler: async (ctx, { id, films, letters }) => {
    const { user } = await requireOwnedProject(ctx, id);
    await limit(ctx, `publish:${user._id}`, 10, 3_600_000);
    await publishWithCredits(ctx, user._id, id, films, !!letters);
  },
});
