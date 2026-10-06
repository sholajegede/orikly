import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { logEvent } from "./lib/events";
import { limit } from "./lib/limit";
import { PACKS, PRICE_KOBO } from "./lib/constants";
import { createJobs } from "./lib/jobs";
import { bump } from "./lib/counters";
import { requireUser } from "./lib/auth";

const naira = (kobo: number) => (kobo / 100).toFixed(2);

/** Which payment routes are switched on. The UI shows online payment first when it is. */
export const config = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return {
      online: !!process.env.BACHS_API_KEY,
      transfer: !!(process.env.BANK_NAME && process.env.BANK_ACCOUNT_NUMBER && process.env.BANK_ACCOUNT_NAME),
    };
  },
});

export const prepare = internalMutation({
  args: { userId: v.id("users"), kind: v.union(v.literal("project"), v.literal("pack")), projectId: v.optional(v.id("projects")), packId: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const user = await ctx.db.get(a.userId);
    if (!user?.email) throw new ConvexError("Add an email to your account first.");
    await limit(ctx, `checkout:${a.userId}`, 10, 3_600_000);
    let amountKobo = 0;
    if (a.kind === "project") {
      const project = a.projectId ? await ctx.db.get(a.projectId) : null;
      if (!project || project.ownerId !== a.userId) throw new ConvexError("Celebration not found.");
      if (project.status === "paid") throw new ConvexError("This celebration is already paid.");
      if (project.status === "suspended") throw new ConvexError("This site is suspended. Contact support.");
      const assets = await ctx.db.query("assets").withIndex("by_project", (q) => q.eq("projectId", project._id)).take(40);
      if (assets.filter((x) => x.kind === "photo").length < 3) throw new ConvexError("Add at least 3 photos first.");
      amountKobo = PRICE_KOBO;
    } else {
      const pack = PACKS.find((p) => p.id === a.packId);
      if (!pack) throw new ConvexError("Pick a pack.");
      amountKobo = pack.priceKobo;
    }
    const reference = `ok_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    await ctx.db.insert("checkouts", { reference, kind: a.kind, userId: a.userId, projectId: a.projectId, packId: a.packId, amountKobo, status: "open", createdAt: Date.now() });
    return { reference, amountKobo, email: user.email, name: user.name ?? undefined };
  },
});

export const attach = internalMutation({
  args: { reference: v.string(), checkoutId: v.string() },
  handler: async (ctx, { reference, checkoutId }) => {
    const row = await ctx.db.query("checkouts").withIndex("by_reference", (q) => q.eq("reference", reference)).unique();
    if (row) await ctx.db.patch(row._id, { checkoutId });
  },
});

async function startCheckout(
  userId: string,
  prep: { reference: string; amountKobo: number; email: string; name?: string },
  urls: { success: string; cancel: string },
  kind: string,
  runAttach: (checkoutId: string) => Promise<unknown>,
) {
  const key = process.env.BACHS_API_KEY;
  if (!key) throw new ConvexError("Online payment is not set up yet. Use bank transfer.");
  const base = (process.env.BACHS_API_URL ?? "https://sandbox-api.bachs.io").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/checkout-sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      pricing: { currency: "NGN", amount: naira(prep.amountKobo) },
      customer: { email: prep.email, name: prep.name },
      success_url: urls.success,
      cancel_url: urls.cancel,
      reference: prep.reference,
      metadata: { kind, user: userId },
      expires_in_minutes: 120,
    }),
  });
  if (!res.ok) {
    console.error("Bachs checkout failed", res.status, await res.text());
    throw new ConvexError("We could not open the payment page. Try again in a minute.");
  }
  const body = (await res.json()) as { checkout_id?: string; checkout_url?: string };
  if (!body.checkout_url || !body.checkout_id) throw new ConvexError("We could not open the payment page. Try again in a minute.");
  await runAttach(body.checkout_id);
  return body.checkout_url;
}

const siteUrl = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const checkoutProject = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in.");
    const prep = await ctx.runMutation(internal.bachs.prepare, { userId, kind: "project", projectId });
    return await startCheckout(
      userId,
      prep,
      { success: `${siteUrl()}/app/${projectId}?paid=1`, cancel: `${siteUrl()}/app/${projectId}` },
      "project",
      (checkoutId) => ctx.runMutation(internal.bachs.attach, { reference: prep.reference, checkoutId }),
    );
  },
});

export const checkoutPack = action({
  args: { packId: v.string() },
  handler: async (ctx, { packId }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in.");
    const prep = await ctx.runMutation(internal.bachs.prepare, { userId, kind: "pack", packId });
    return await startCheckout(
      userId,
      prep,
      { success: `${siteUrl()}/app/credits?paid=1`, cancel: `${siteUrl()}/app/credits` },
      "pack",
      (checkoutId) => ctx.runMutation(internal.bachs.attach, { reference: prep.reference, checkoutId }),
    );
  },
});

/** Called by the webhook after the signature is checked. Safe to run twice for the same event. */
export const fulfil = internalMutation({
  args: { eventId: v.string(), type: v.string(), reference: v.string(), amount: v.string(), currency: v.string(), status: v.string() },
  handler: async (ctx, a) => {
    const seen = await ctx.db.query("webhookEvents").withIndex("by_event", (q) => q.eq("eventId", a.eventId)).first();
    if (seen) return "duplicate";
    await ctx.db.insert("webhookEvents", { eventId: a.eventId, type: a.type, at: Date.now() });

    const row = await ctx.db.query("checkouts").withIndex("by_reference", (q) => q.eq("reference", a.reference)).unique();
    if (!row) return "unknown_reference";
    if (row.status === "paid") return "already_paid";

    const paidKobo = Math.round(parseFloat(a.amount) * 100);
    if (a.status.toUpperCase() !== "SUCCEEDED" || a.currency !== "NGN" || !(paidKobo >= row.amountKobo)) {
      await logEvent(ctx, { name: "payment_mismatch", userId: row.userId, props: { reference: a.reference, amount: a.amount, currency: a.currency, status: a.status } });
      return "mismatch";
    }

    const now = Date.now();
    await ctx.db.patch(row._id, { status: "paid", paidAt: now });

    if (row.kind === "project" && row.projectId) {
      const project = await ctx.db.get(row.projectId);
      if (!project) return "no_project";
      if (project.status !== "paid") {
        await ctx.db.patch(project._id, { status: project.status === "suspended" ? "suspended" : "paid", paidAt: project.paidAt ?? now, updatedAt: now });
        await ctx.db.insert("payments", { projectId: project._id, ownerId: project.ownerId, method: "bachs", amountKobo: paidKobo, status: "confirmed", reference: a.reference, createdAt: now, confirmedAt: now });
        if (project.status !== "suspended") await createJobs(ctx, { ...project, status: "paid" });
        await logEvent(ctx, { name: "payment_confirmed", userId: project.ownerId, projectId: project._id, props: { method: "bachs" } });
      }
    } else if (row.kind === "pack" && row.packId) {
      const pack = PACKS.find((p) => p.id === row.packId);
      const user = await ctx.db.get(row.userId);
      if (pack && user) {
        await ctx.db.patch(user._id, { credits: (user.credits ?? 0) + pack.credits });
        await ctx.db.insert("packOrders", { userId: user._id, packId: pack.id, credits: pack.credits, amountKobo: paidKobo, status: "confirmed", senderName: "Paid online", reference: a.reference, createdAt: now, confirmedAt: now });
        await logEvent(ctx, { name: "pack_confirmed", userId: user._id, props: { pack: pack.id, method: "bachs" } });
      }
    }
    await bump(ctx, "payments_online");
    return "fulfilled";
  },
});

