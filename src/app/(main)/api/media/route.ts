import type { NextRequest } from "next/server";

/**
 * Serves a file from our own Convex storage on our own origin.
 * The video maker draws photos onto a canvas, and a canvas only allows recording when every image is same-origin.
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("u");
  const base = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!target || !base) return new Response("Bad request", { status: 400 });

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (url.protocol !== "https:" || url.host !== new URL(base).host || !url.pathname.startsWith("/api/storage/")) {
    return new Response("Not allowed", { status: 403 });
  }

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });
  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!/^(image|audio|video)\//.test(type)) return new Response("Not allowed", { status: 403 });

  return new Response(upstream.body, {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
