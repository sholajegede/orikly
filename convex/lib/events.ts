import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type Props = Record<string, string | number | boolean | null>;

export async function logEvent(
  ctx: MutationCtx,
  e: { name: string; userId?: Id<"users">; projectId?: Id<"projects">; props?: Props },
) {
  await ctx.db.insert("events", { at: Date.now(), ...e });
}
