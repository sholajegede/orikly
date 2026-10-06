import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const TOLERANCE_SECONDS = 300;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Bachs signs `${timestamp}.${rawBody}` with HMAC-SHA256. The header is `t=<unix>,v1=<hex>[,v1=<hex>]`. */
async function validSignature(header: string | null, raw: string, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim());
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || sigs.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  return sigs.some((s) => sameString(s, expected));
}

http.route({
  path: "/bachs/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.BACHS_WEBHOOK_SECRET;
    if (!secret) return new Response("Not configured", { status: 503 });
    const raw = await request.text();
    if (!(await validSignature(request.headers.get("X-Bachs-Signature-V2"), raw, secret))) {
      return new Response("Bad signature", { status: 401 });
    }
    let event: { id?: string; type?: string; data?: Record<string, unknown> };
    try {
      event = JSON.parse(raw);
    } catch {
      return new Response("Bad body", { status: 400 });
    }
    // Only a collected payment can fulfil an order. Everything else is acknowledged and ignored.
    if (event.type === "collection.succeeded" && event.id && event.data) {
      const d = event.data;
      await ctx.runMutation(internal.bachs.fulfil, {
        eventId: event.id,
        type: event.type,
        reference: String(d.reference ?? ""),
        amount: String(d.amount ?? "0"),
        currency: String(d.currency ?? ""),
        status: String(d.status ?? ""),
      });
    }
    return new Response("ok", { status: 200 });
  }),
});

// The studio job (src/trigger/produce.ts) calls these. Both sides hold STUDIO_SECRET.
function studioRoute(path: string, run: (ctx: Parameters<Parameters<typeof httpAction>[0]>[0], body: Record<string, unknown>) => Promise<unknown>) {
  http.route({
    path,
    method: "POST",
    handler: httpAction(async (ctx, request) => {
      const secret = process.env.STUDIO_SECRET;
      const given = request.headers.get("Authorization") ?? "";
      if (!secret || !sameString(given, `Bearer ${secret}`)) return new Response("Not allowed", { status: 401 });
      try {
        const body = (await request.json()) as Record<string, unknown>;
        return Response.json((await run(ctx, body)) ?? { ok: true });
      } catch (e) {
        const data = (e as { data?: unknown })?.data;
        return Response.json({ error: typeof data === "string" ? data : "The studio hit a problem." }, { status: 400 });
      }
    }),
  });
}
type Pid = Id<"projects">;
studioRoute("/studio/gather", (ctx, b) => ctx.runQuery(internal.studio.gather, { projectId: b.projectId as Pid }));
studioRoute("/studio/stage", (ctx, b) => ctx.runMutation(internal.studio.setStage, { projectId: b.projectId as Pid, stage: b.stage as "designing", note: b.note as string | undefined }));
studioRoute("/studio/design", (ctx, b) => ctx.runAction(internal.studio.design, { projectId: b.projectId as Pid, shots: b.shots as Id<"_storage">[] | undefined }));
studioRoute("/studio/upload", async (ctx) => ({ url: await ctx.runMutation(internal.studio.uploadUrl, {}) }));
studioRoute("/studio/film", (ctx, b) => ctx.runMutation(internal.studio.saveFilm, { projectId: b.projectId as Pid, storageId: b.storageId as Id<"_storage">, format: b.format as "portrait", letters: b.letters === true }));

export default http;
