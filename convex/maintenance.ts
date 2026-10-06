import { internalMutation } from "./_generated/server";

export const clearRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db
      .query("rateLimits")
      .withIndex("by_window", (q) => q.lt("windowStart", Date.now() - 2 * 3_600_000))
      .take(500);
    for (const r of old) await ctx.db.delete(r._id);
  },
});
