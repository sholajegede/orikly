// Shared by the Convex backend and the Next.js frontend. Keep this file dependency-free.

// Everything is bought with credits. One credit is about NGN 1,000, less when more are bought at once.
/** What each thing costs, in credits. */
export const COST = { site: 5, film: 2, redesign: 3, refilm: 1 } as const;
/** A website and both films. */
export const FULL_CREDITS = COST.site + COST.film * 2;
/** The amounts of credits that can be bought. The starter covers one full celebration with 3 credits to spare. */
export const CREDIT_STEPS = [3, 6, 12, 18, 24, 36, 48, 60, 90, 120, 180, 240] as const;
export const STARTER_CREDITS = 12;
const CREDIT_RATES = [
  { from: 120, eachKobo: 70_000 },
  { from: 60, eachKobo: 75_000 },
  { from: 24, eachKobo: 80_000 },
  { from: 12, eachKobo: 83_334 },
  { from: 0, eachKobo: 100_000 },
] as const;
/** The price of a number of credits, rounded to the nearest NGN 50. */
export function creditPriceKobo(credits: number): number {
  const rate = CREDIT_RATES.find((r) => credits >= r.from) ?? CREDIT_RATES[CREDIT_RATES.length - 1];
  return Math.round((credits * rate.eachKobo) / 5_000) * 5_000;
}
/** The smallest purchase that covers a shortfall. */
export function creditStepFor(shortfall: number): number {
  return CREDIT_STEPS.find((s) => s >= shortfall) ?? CREDIT_STEPS[CREDIT_STEPS.length - 1];
}
export const PRICE_KOBO = creditPriceKobo(STARTER_CREDITS); // NGN 10,000
export const PRICE_LABEL = "₦10,000";

export const MAX_PHOTOS = 30;
export const MAX_VIDEOS = 5;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const MAX_SONG_BYTES = 15 * 1024 * 1024;
// No limit on celebrations. Only unfinished drafts are capped, to stop someone filling the database for free.
export const MAX_DRAFTS_PER_USER = 10;
export const MAX_WISHES_PER_SITE = 200;

export const OCCASIONS = [
  { id: "wedding", label: "Wedding", namesLabel: "Couple's names", namesHint: "Tolu & Bisi", dateLabel: "Wedding date" },
  { id: "birthday", label: "Birthday", namesLabel: "Celebrant's name", namesHint: "Yemisi", dateLabel: "Birthday" },
  { id: "anniversary", label: "Anniversary", namesLabel: "Couple's names", namesHint: "Tolu & Bisi", dateLabel: "Anniversary date" },
] as const;
export type OccasionId = (typeof OCCASIONS)[number]["id"];

export const SITE_STYLES = [
  { id: "editorial", name: "Lilac Editorial", blurb: "Bold, modern and clean" },
  { id: "owambe", name: "Gold Owambe", blurb: "Warm, festive and elegant" },
  { id: "midnight", name: "Midnight", blurb: "Dark and romantic" },
  { id: "garden", name: "Garden", blurb: "Soft, light and gentle" },
] as const;

export const PALETTES = [
  { id: "lilac", name: "Lilac", bg: "#f7f4ff", card: "#ffffff", ink: "#1d1633", muted: "#6b6485", accent: "#7c5cff", accent2: "#c9b8ff", onAccent: "#ffffff" },
  { id: "rose", name: "Rose", bg: "#fff5f7", card: "#ffffff", ink: "#3a1420", muted: "#85626c", accent: "#e0457b", accent2: "#ffc2d4", onAccent: "#ffffff" },
  { id: "gold", name: "Gold", bg: "#fffaf0", card: "#ffffff", ink: "#2b2110", muted: "#7a6a4a", accent: "#c8962b", accent2: "#f3dca0", onAccent: "#ffffff" },
  { id: "emerald", name: "Emerald", bg: "#f2fbf6", card: "#ffffff", ink: "#10281c", muted: "#55705f", accent: "#1f9d62", accent2: "#b7ecd0", onAccent: "#ffffff" },
  { id: "ocean", name: "Ocean", bg: "#f2f8ff", card: "#ffffff", ink: "#0f2238", muted: "#58708a", accent: "#2878e6", accent2: "#bcd8ff", onAccent: "#ffffff" },
  { id: "sunset", name: "Sunset", bg: "#fff6f0", card: "#ffffff", ink: "#341a10", muted: "#86644f", accent: "#ee6a2c", accent2: "#ffd0b5", onAccent: "#ffffff" },
] as const;

export const VIDEO_STYLES = [
  { id: "cinematic", name: "Cinematic", blurb: "Slow and emotional, big photos" },
  { id: "reel", name: "Reel", blurb: "Fast and bright, made for status" },
  { id: "storybook", name: "Storybook", blurb: "Words and photos, one line at a time" },
] as const;

// Songs: v0 ships with no licensed library. Add rows here once tracks have written licenses.
export const SONG_LIBRARY: { id: string; title: string; artist: string }[] = [];

export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "mail", "help", "support", "pay", "payments", "status", "cdn", "assets", "static",
  "blog", "orikly", "login", "logout", "signin", "signup", "dashboard", "s", "new", "terms", "privacy", "refunds",
  "about", "contact", "team", "docs", "demo", "test", "staging", "dev", "root", "owner", "billing", "wishes", "creators", "partners", "studio", "credits", "packs",
]);

export const BLOCKED_WORDS = ["fuck", "shit", "porn", "sex", "nude", "xxx", "scam"];

export const PROJECT_STATUSES = ["draft", "paid", "suspended"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return "Use at least 3 characters.";
  if (slug.length > 30) return "Use 30 characters or fewer.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "Use letters, numbers and single hyphens only.";
  if (RESERVED_SLUGS.has(slug)) return "That name is reserved. Try another.";
  if (BLOCKED_WORDS.some((w) => slug.includes(w))) return "That name is not allowed.";
  return null;
}

export const CREATOR_PAYOUT_KOBO = 350_000; // paid per approved video, two videos per celebration
export const MIN_PAYOUT_KOBO = 500_000;
export const JOB_CLAIM_HOURS = 48;
export const CREATOR_MAX_ACTIVE = 2;
export const MAX_DELIVERABLE_BYTES = 200 * 1024 * 1024;

export const VIDEO_SLOTS = ["portrait", "landscape"] as const;
