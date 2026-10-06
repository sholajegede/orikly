import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser, isAdminEmail, requireUser } from "./lib/auth";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email ?? null,
      name: user.name ?? null,
      whatsapp: user.whatsapp ?? null,
      isAdmin: isAdminEmail(user.email),
      credits: user.credits ?? 0,
    };
  },
});

export const setProfile = mutation({
  args: { name: v.optional(v.string()), whatsapp: v.optional(v.string()) },
  handler: async (ctx, { name, whatsapp }) => {
    const user = await requireUser(ctx);
    const patch: { name?: string; whatsapp?: string } = {};
    if (name !== undefined) patch.name = name.trim().slice(0, 80);
    if (whatsapp !== undefined) patch.whatsapp = whatsapp.replace(/[^\d+]/g, "").slice(0, 20);
    await ctx.db.patch(user._id, patch);
  },
});
