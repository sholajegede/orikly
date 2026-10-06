import { ConvexError } from "convex/values";

export function naira(kobo: number): string {
  return "₦" + (kobo / 100).toLocaleString("en-NG");
}

export function shortDate(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function siteUrl(slug: string): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (root && root !== "localhost") return `https://${slug}.${root}`;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/s/${slug}`;
}

/** Turn an error into a sentence we can show a customer. */
export function cleanError(e: unknown): string {
  if (e instanceof ConvexError) return typeof e.data === "string" ? e.data : "Something went wrong. Try again.";
  const m = e instanceof Error ? e.message : String(e);
  const hit = m.match(/Uncaught (?:Convex)?Error: ([^\n]+)/);
  if (hit) return hit[1].replace(/\s+at .*$/, "");
  if (/Convex|Request ID|Server Error/i.test(m)) return "Something went wrong. Try again.";
  return m.length > 160 ? "Something went wrong. Try again." : m;
}
