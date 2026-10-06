import { internalMutation } from "./_generated/server";

/** Put back jobs whose creator did not deliver in time. */
export const releaseOverdueJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const late = await ctx.db
      .query("jobs")
      .withIndex("by_status_due", (q) => q.eq("status", "claimed").lt("dueAt", Date.now()))
      .take(100);
    for (const j of late) {
      await ctx.db.patch(j._id, { status: "open", creatorId: undefined, claimedAt: undefined, dueAt: undefined, reviewNote: undefined });
    }
  },
});

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
