import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { CREATOR_PAYOUT_KOBO } from "./constants";
import { bump } from "./counters";

/** Turn a paid celebration into two open video jobs. Safe to call twice. */
export async function createJobs(ctx: MutationCtx, project: Doc<"projects">) {
  const existing = await ctx.db.query("jobs").withIndex("by_project", (q) => q.eq("projectId", project._id)).first();
  if (existing) return;
  const styles = project.videoStyles.length ? project.videoStyles : ["cinematic"];
  const now = Date.now();
  const slots = [
    { slot: "portrait" as const, style: styles[0] },
    { slot: "landscape" as const, style: styles[1] ?? styles[0] },
  ];
  for (const s of slots) {
    await ctx.db.insert("jobs", { projectId: project._id, slot: s.slot, style: s.style, payoutKobo: CREATOR_PAYOUT_KOBO, status: "open", createdAt: now });
  }
  await bump(ctx, "jobs_opened", { by: 2 });
}
