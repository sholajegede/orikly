import type { MutationCtx, QueryCtx } from "../_generated/server";

const SHARDS = 16;
export const DAY_MS = 86_400_000;

export function dayOf(t: number = Date.now()): number {
  return Math.floor(t / DAY_MS);
}

async function add(ctx: MutationCtx, key: string, day: number, by: number) {
  const shard = Math.floor(Math.random() * SHARDS);
  const row = await ctx.db
    .query("counters")
    .withIndex("by_key_day", (q) => q.eq("key", key).eq("day", day).eq("shard", shard))
    .first();
  if (row) await ctx.db.patch(row._id, { n: row.n + by });
  else await ctx.db.insert("counters", { key, day, shard, n: by });
}

/** Add to a daily counter. With lifetime, also add to the all-time bucket (day 0). */
export async function bump(ctx: MutationCtx, key: string, opts: { by?: number; lifetime?: boolean } = {}) {
  const by = opts.by ?? 1;
  await add(ctx, key, dayOf(), by);
  if (opts.lifetime) await add(ctx, key, 0, by);
}

export async function sumSince(ctx: QueryCtx, key: string, sinceDay: number): Promise<number> {
  const rows = await ctx.db
    .query("counters")
    .withIndex("by_key_day", (q) => q.eq("key", key).gte("day", Math.max(sinceDay, 1)))
    .take(6_000);
  return rows.reduce((s, r) => s + r.n, 0);
}

export async function lifetime(ctx: QueryCtx, key: string): Promise<number> {
  const rows = await ctx.db
    .query("counters")
    .withIndex("by_key_day", (q) => q.eq("key", key).eq("day", 0))
    .take(64);
  return rows.reduce((s, r) => s + r.n, 0);
}
