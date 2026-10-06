// The design of one celebration website, as data. The AI designer writes it, the customer can edit it by hand,
// and the website renders from it. Shared by the backend and the frontend. Keep this file dependency-free.

export const DISPLAY_FONTS = ["Instrument Serif", "Cormorant Garamond", "Playfair Display", "Fraunces", "DM Serif Display", "Abril Fatface", "Anton", "Bricolage Grotesque", "Syne"] as const;
export const BODY_FONTS = ["DM Sans", "Figtree", "Karla", "Bricolage Grotesque"] as const;
export const HERO_VARIANTS = ["full", "split", "stack", "collage"] as const;
export const MOTIFS = ["none", "adire", "asooke", "ankara", "kente"] as const;
export const SECTION_TYPES = ["story", "quote", "numbers", "gallery", "details", "videos", "moment", "note", "gift", "wishes"] as const;
export const GALLERY_LAYOUTS = ["masonry", "grid", "filmstrip", "featured", "wall"] as const;
export const STORY_LAYOUTS = ["plain", "dropcap", "side"] as const;

export type SectionType = (typeof SECTION_TYPES)[number];
export type DesignSection = { type: SectionType; title?: string; hidden?: boolean; layout?: string; photos?: string[]; photo?: string; text?: string; lines?: string[]; items?: { value: string; label: string }[] };
export type SiteDesign = {
  v: 1;
  colors: { bg: string; ink: string; accent: string; card: string; muted: string };
  fonts: { display: (typeof DISPLAY_FONTS)[number]; body: (typeof BODY_FONTS)[number] };
  namesStyle: "upper" | "italic" | "plain";
  hero: { variant: (typeof HERO_VARIANTS)[number]; photo?: string; extra?: string[]; fx: number; fy: number; kicker?: string; tagline?: string };
  motif: (typeof MOTIFS)[number];
  sections: DesignSection[];
  at: number;
  by: "ai" | "you";
};

const FONT_SPEC: Record<string, string> = {
  "Instrument Serif": "Instrument+Serif:ital@0;1",
  "Cormorant Garamond": "Cormorant+Garamond:ital,wght@0,600;1,600",
  "Playfair Display": "Playfair+Display:ital,wght@0,500;0,700;1,500",
  Fraunces: "Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700",
  "DM Serif Display": "DM+Serif+Display:ital@0;1",
  "Abril Fatface": "Abril+Fatface",
  Anton: "Anton",
  "Bricolage Grotesque": "Bricolage+Grotesque:opsz,wght@12..96,300..700",
  Syne: "Syne:wght@500;700",
  "DM Sans": "DM+Sans:wght@400;500;700",
  Figtree: "Figtree:wght@400;500;700",
  Karla: "Karla:wght@400;500;700",
};

export function fontsHref(d: SiteDesign): string {
  const fams = [...new Set([d.fonts.display, d.fonts.body])].map((f) => `family=${FONT_SPEC[f]}`).join("&");
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** Black or white, whichever reads better on the colour. */
export function onColor(hex: string): string {
  return contrast(hex, "#ffffff") >= contrast(hex, "#1f0f08") ? "#ffffff" : "#1f0f08";
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = <T extends readonly string[]>(list: T, x: unknown, fallback: T[number]): T[number] => ((list as readonly string[]).includes(x as string) ? (x as T[number]) : fallback);
const text = (x: unknown, max: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, max) : undefined);
const num = (x: unknown, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : fallback);

/**
 * Turn anything (an AI answer, an edit from the browser) into a design the website can safely render.
 * Unknown values fall back to safe ones, colours that cannot be read are replaced, and every photo and every
 * kind of content the customer has still gets a place.
 */
export function tidyDesign(raw: unknown, photoIds: string[], by: "ai" | "you"): SiteDesign | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const c = (r.colors ?? {}) as Record<string, unknown>;
  const hex = (x: unknown, fallback: string) => (typeof x === "string" && HEX.test(x) ? x.toLowerCase() : fallback);

  let bg = hex(c.bg, "#f3eee4");
  let ink = hex(c.ink, "#1f0f08");
  if (contrast(bg, ink) < 7) ink = lum(bg) > 0.4 ? "#1f0f08" : "#fffdf8";
  let accent = hex(c.accent, "#2b2fa8");
  if (contrast(bg, accent) < 3) accent = lum(bg) > 0.4 ? "#2b2fa8" : "#e9b13c";
  const dark = lum(bg) < 0.2;
  let card = hex(c.card, dark ? "#1c1626" : "#fffdf8");
  if (contrast(card, ink) < 7) card = dark ? "#1c1626" : "#fffdf8";
  let muted = hex(c.muted, dark ? "#b8b0c8" : "#6e5f55");
  if (contrast(bg, muted) < 4.5) muted = dark ? "#b8b0c8" : "#6e5f55";

  const valid = new Set(photoIds);
  const own = (x: unknown) => (typeof x === "string" && valid.has(x) ? x : undefined);
  const h = (r.hero ?? {}) as Record<string, unknown>;
  const heroPhoto = own(h.photo) ?? photoIds[0];
  const extra = (Array.isArray(h.extra) ? h.extra : []).map(own).filter((x): x is string => !!x && x !== heroPhoto).slice(0, 2);
  let variant = pick(HERO_VARIANTS, h.variant, "full");
  if (!heroPhoto) variant = "stack";
  if (variant === "collage" && extra.length < 2) variant = "full";

  const sections: DesignSection[] = [];
  const placed = new Set<string>();
  for (const s of Array.isArray(r.sections) ? (r.sections as Record<string, unknown>[]) : []) {
    const type = pick(SECTION_TYPES, s?.type, "story");
    if (s?.type !== type) continue;
    if (type !== "gallery" && type !== "quote" && sections.some((x) => x.type === type)) continue;
    if (type === "quote" && sections.filter((x) => x.type === "quote").length >= 3) continue;
    const sec: DesignSection = { type, title: text(s.title, 60), hidden: s.hidden === true ? true : undefined };
    if (type === "gallery") {
      sec.layout = pick(GALLERY_LAYOUTS, s.layout, "masonry");
      const lines = Array.isArray(s.lines) ? s.lines : [];
      const pairs = (Array.isArray(s.photos) ? s.photos : []).map((x, i) => ({ id: own(x), line: text(lines[i], 120) ?? "" })).filter((x): x is { id: string; line: string } => !!x.id);
      const fresh = pairs.filter((x, i) => !placed.has(x.id) && pairs.findIndex((y) => y.id === x.id) === i);
      sec.photos = fresh.map((x) => x.id);
      sec.photos.forEach((p) => placed.add(p));
      if (sec.photos.length === 0) continue;
      if (fresh.some((x) => x.line)) sec.lines = fresh.map((x) => x.line);
    }
    if (type === "story") {
      sec.layout = pick(STORY_LAYOUTS, s.layout, "plain");
      sec.photo = own(s.photo);
    }
    if (type === "numbers") {
      sec.items = (Array.isArray(s.items) ? (s.items as Record<string, unknown>[]) : [])
        .map((x) => ({ value: text(x?.value, 14) ?? "", label: text(x?.label, 48) ?? "" }))
        .filter((x) => x.value && x.label)
        .slice(0, 4);
      if (sec.items.length < 2) continue;
    }
    if (type === "quote") {
      sec.text = text(s.text, 220);
      if (!sec.text) continue;
    }
    sections.push(sec);
    if (sections.length >= 14) break;
  }
  // Every photo keeps a place, and every kind of content the customer may have stays reachable.
  const left = photoIds.filter((p) => !placed.has(p));
  const lastGallery = [...sections].reverse().find((s) => s.type === "gallery");
  if (left.length) {
    if (lastGallery) lastGallery.photos = [...(lastGallery.photos ?? []), ...left];
    else sections.push({ type: "gallery", layout: "masonry", photos: left });
  }
  for (const type of ["story", "details", "videos", "note", "gift", "wishes"] as const) {
    if (!sections.some((s) => s.type === type)) sections.push({ type });
  }

  return {
    v: 1,
    colors: { bg, ink, accent, card, muted },
    fonts: { display: pick(DISPLAY_FONTS, (r.fonts as Record<string, unknown> | undefined)?.display, "Instrument Serif"), body: pick(BODY_FONTS, (r.fonts as Record<string, unknown> | undefined)?.body, "DM Sans") },
    namesStyle: pick(["upper", "italic", "plain"] as const, r.namesStyle, "plain"),
    hero: { variant, photo: heroPhoto, extra, fx: num(h.fx, 0.5), fy: num(h.fy, 0.35), kicker: text(h.kicker, 50), tagline: text(h.tagline, 140) },
    motif: pick(MOTIFS, r.motif, "none"),
    sections,
    at: Date.now(),
    by,
  };
}

type StarterPalette = { bg: string; card: string; ink: string; muted: string; accent: string };
const STARTER_LOOK: Record<string, Pick<SiteDesign, "fonts" | "namesStyle" | "motif"> & { hero: SiteDesign["hero"]["variant"] }> = {
  editorial: { fonts: { display: "Anton", body: "DM Sans" }, namesStyle: "upper", motif: "none", hero: "full" },
  owambe: { fonts: { display: "Cormorant Garamond", body: "DM Sans" }, namesStyle: "italic", motif: "asooke", hero: "split" },
  midnight: { fonts: { display: "Playfair Display", body: "Figtree" }, namesStyle: "plain", motif: "none", hero: "full" },
  garden: { fonts: { display: "Fraunces", body: "Karla" }, namesStyle: "plain", motif: "none", hero: "stack" },
};

/** A design built from the standard look, so a customer can edit by hand without the AI designer. */
export function starterDesign(siteStyle: string, palette: StarterPalette, photoIds: string[]): SiteDesign {
  const look = STARTER_LOOK[siteStyle] ?? STARTER_LOOK.editorial;
  const colors = siteStyle === "midnight" ? { bg: "#0d0a16", card: "#171226", ink: "#f4f0ff", muted: "#a79fc2", accent: palette.accent } : palette;
  const raw = {
    colors,
    fonts: look.fonts,
    namesStyle: look.namesStyle,
    motif: look.motif,
    hero: { variant: look.hero, photo: photoIds[0] },
    sections: [{ type: "details" }, { type: "story" }, { type: "videos" }, { type: "gallery", layout: "masonry", photos: photoIds }, { type: "moment" }, { type: "note" }, { type: "wishes" }, { type: "gift" }],
  };
  return tidyDesign(raw, photoIds, "you") as SiteDesign;
}
