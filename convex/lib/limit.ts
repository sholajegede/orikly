import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

/** Fixed-window limit per key. Use for signed-in actions; rows are cleared hourly by a cron. */
export async function limit(ctx: MutationCtx, key: string, max: number, windowMs: number, message = "Too many tries. Wait a moment and try again.") {
  const now = Date.now();
  const row = await ctx.db.query("rateLimits").withIndex("by_key", (q) => q.eq("key", key)).first();
  if (!row || now - row.windowStart >= windowMs) {
    if (row) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return;
  }
  if (row.count >= max) throw new ConvexError(message);
  await ctx.db.patch(row._id, { count: row.count + 1 });
}
