import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}

export async function currentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const id = await getAuthUserId(ctx);
  if (!id) return null;
  return await ctx.db.get(id);
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user) throw new ConvexError("Please sign in.");
  return user;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!isAdminEmail(user.email)) throw new ConvexError("Not allowed.");
  return user;
}

export async function requireOwnedProject(ctx: Ctx, projectId: Doc<"projects">["_id"]) {
  const user = await requireUser(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.ownerId !== user._id) throw new ConvexError("Project not found.");
  return { user, project };
}
