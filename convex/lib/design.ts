// One celebration's design, as data: the website and the film are both drawn from it.
// The AI art director writes it, a customer can edit it by hand, and `tidyDesign` makes anything safe to render.
// Shared by the backend, the website, the film renderer and the studio job. Keep this file dependency-free.

export const DISPLAY_FONTS = ["Anton", "Bebas Neue", "Abril Fatface", "DM Serif Display", "Playfair Display", "Cormorant Garamond", "Fraunces", "Instrument Serif", "Syne", "Bricolage Grotesque"] as const;
export const BODY_FONTS = ["DM Sans", "Figtree", "Karla", "Bricolage Grotesque"] as const;
export const HERO_LAYOUTS = ["poster", "split", "cover"] as const;
export const RADII = ["round", "soft", "sharp"] as const;
export const SECTION_TYPES = ["wall", "moment", "letter", "details", "films", "gift", "wishes"] as const;
export const SCENE_KINDS = ["title", "meet", "photo", "counter", "wall", "line", "clip", "wish", "closing"] as const;
export const TONES = ["light", "dark", "loud"] as const;

export type Tile = { t: "photo"; photo: string; wide?: boolean } | { t: "quote"; text: string; meta?: string; chip?: string } | { t: "clip"; clip: string };
export type DesignSection = {
  type: (typeof SECTION_TYPES)[number];
  title?: string;
  label?: string;
  sub?: string;
  hidden?: boolean;
  tiles?: Tile[];
  button?: string;
  after?: string;
  photos?: string[];
  big?: number[];
  sign?: string;
};
export type Scene = {
  kind: (typeof SCENE_KINDS)[number];
  seconds: number;
  tone?: (typeof TONES)[number];
  photo?: string;
  photos?: string[];
  clip?: string;
  text?: string;
  body?: string;
  meta?: string;
  chip?: string;
};
export type Colors = { bg: string; card: string; ink: string; muted: string; loud: string; loudDeep: string; loudInk: string; hi: string; hiInk: string };
export type SiteDesign = {
  v: 2;
  colors: Colors;
  fonts: { display: (typeof DISPLAY_FONTS)[number]; body: (typeof BODY_FONTS)[number] };
  caps: boolean;
  radius: (typeof RADII)[number];
  hero: { layout: (typeof HERO_LAYOUTS)[number]; lines: string[]; accent: number; sub?: string; left?: string; right?: string; photo?: string };
  ticker: string[];
  opener?: { text: string; from?: string; to?: string };
  count?: { label: string; value: string; note?: string; rows: { label: string; value: string }[] };
  sections: DesignSection[];
  closing: { lines: string[]; small?: string; sign?: string };
  focus: Record<string, [number, number]>;
  film: Scene[];
  at: number;
  by: "ai" | "you";
};

const FONT_SPEC: Record<string, string> = {
  Anton: "Anton",
  "Bebas Neue": "Bebas+Neue",
  "Abril Fatface": "Abril+Fatface",
  "DM Serif Display": "DM+Serif+Display:ital@0;1",
  "Playfair Display": "Playfair+Display:ital,wght@0,600;0,800;1,600",
  "Cormorant Garamond": "Cormorant+Garamond:ital,wght@0,600;1,600",
  Fraunces: "Fraunces:ital,opsz,wght@0,9..144,500..800;1,9..144,500..800",
  "Instrument Serif": "Instrument+Serif:ital@0;1",
  Syne: "Syne:wght@600;800",
  "Bricolage Grotesque": "Bricolage+Grotesque:opsz,wght@12..96,300..800",
  "DM Sans": "DM+Sans:wght@400;500;700",
  Figtree: "Figtree:wght@400;500;700",
  Karla: "Karla:wght@400;500;700",
};
export const DISPLAY_WEIGHT: Record<string, number> = { "Bricolage Grotesque": 800, Syne: 800, Fraunces: 700, "Playfair Display": 800, "Cormorant Garamond": 600 };
/** Condensed poster faces are set tighter and larger than serifs, so sizes are scaled per face. */
export const DISPLAY_SCALE: Record<string, number> = { Anton: 1, "Bebas Neue": 1.06, "Abril Fatface": 0.8, "DM Serif Display": 0.82, "Playfair Display": 0.76, "Cormorant Garamond": 0.92, Fraunces: 0.74, "Instrument Serif": 0.94, Syne: 0.66, "Bricolage Grotesque": 0.72 };

export function fontsHref(d: Pick<SiteDesign, "fonts">): string {
  const fams = [...new Set([d.fonts.display, d.fonts.body, "DM Mono"])].map((f) => `family=${f === "DM Mono" ? "DM+Mono:wght@400;500" : FONT_SPEC[f]}`).join("&");
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
/** Near-black or near-white, whichever reads better on the colour. */
export function onColor(hex: string): string {
  return contrast(hex, "#fffdf8") >= contrast(hex, "#14101a") ? "#fffdf8" : "#14101a";
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = <T extends readonly string[]>(list: T, x: unknown, fallback: T[number]): T[number] => ((list as readonly string[]).includes(x as string) ? (x as T[number]) : fallback);
const str = (x: unknown, max: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, max) : undefined);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === "object" ? (x as Record<string, unknown>) : {});

function tidyColors(raw: unknown): Colors {
  const c = obj(raw);
  const hex = (x: unknown, fallback: string) => (typeof x === "string" && HEX.test(x) ? x.toLowerCase() : fallback);
  const bg = hex(c.bg, "#e7e4ee");
  const dark = lum(bg) < 0.2;
  let ink = hex(c.ink, dark ? "#f3effc" : "#0d0b12");
  if (contrast(bg, ink) < 7) ink = dark ? "#f3effc" : "#0d0b12";
  let card = hex(c.card, dark ? "#1c1927" : "#f9f8fc");
  if (contrast(card, ink) < 7) card = dark ? "#1c1927" : "#f9f8fc";
  let muted = hex(c.muted, dark ? "#a59fb7" : "#5f5a6b");
  if (contrast(bg, muted) < 4.5) muted = dark ? "#a59fb7" : "#5f5a6b";
  const loud = hex(c.loud, "#b79cf5");
  let loudInk = hex(c.loudInk, onColor(loud));
  if (contrast(loud, loudInk) < 5) loudInk = onColor(loud);
  let loudDeep = hex(c.loudDeep, loud);
  if (contrast(bg, loudDeep) < 3) loudDeep = contrast(bg, loud) >= 3 ? loud : ink;
  const hi = hex(c.hi, "#f3ea76");
  let hiInk = hex(c.hiInk, onColor(hi));
  if (contrast(hi, hiInk) < 5) hiInk = onColor(hi);
  return { bg, card, ink, muted, loud, loudDeep, loudInk, hi, hiInk };
}

/**
 * Turn anything (an AI answer, an edit from the browser) into a design that is safe to render.
 * Unknown values fall back, unreadable colours are replaced, every photo keeps a place on the page,
 * and every kind of content the customer may have stays reachable.
 */
export function tidyDesign(raw: unknown, photoIds: string[], clipIds: string[], by: "ai" | "you"): SiteDesign | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const okPhoto = new Set(photoIds);
  const okClip = new Set(clipIds);
  const photo = (x: unknown) => (typeof x === "string" && okPhoto.has(x) ? x : undefined);
  const clip = (x: unknown) => (typeof x === "string" && okClip.has(x) ? x : undefined);

  const h = obj(r.hero);
  const lines = arr(h.lines).map((x) => str(x, 28)).filter((x): x is string => !!x).slice(0, 3);
  if (lines.length === 0) return null;
  const heroPhoto = photo(h.photo) ?? photoIds[0];
  let layout = pick(HERO_LAYOUTS, h.layout, "poster");
  if (!heroPhoto) layout = "poster";

  const sections: DesignSection[] = [];
  const placed = new Set<string>();
  const usedClips = new Set<string>();
  for (const x of arr(r.sections)) {
    const s = obj(x);
    const type = pick(SECTION_TYPES, s.type, "wall");
    if (s.type !== type) continue;
    if (type !== "wall" && sections.some((y) => y.type === type)) continue;
    if (type === "wall" && sections.filter((y) => y.type === "wall").length >= 3) continue;
    const sec: DesignSection = { type, title: str(s.title, 40), label: str(s.label, 70), sub: str(s.sub, 120), hidden: s.hidden === true ? true : undefined };
    if (type === "wall") {
      const tiles: Tile[] = [];
      for (const y of arr(s.tiles)) {
        const t = obj(y);
        if (t.t === "photo") {
          const id = photo(t.photo);
          if (id && !placed.has(id)) {
            placed.add(id);
            tiles.push({ t: "photo", photo: id, wide: t.wide === true ? true : undefined });
          }
        } else if (t.t === "quote") {
          const text = str(t.text, 130);
          if (text) tiles.push({ t: "quote", text, meta: str(t.meta, 60), chip: str(t.chip, 28) });
        } else if (t.t === "clip") {
          const id = clip(t.clip);
          if (id && !usedClips.has(id)) {
            usedClips.add(id);
            tiles.push({ t: "clip", clip: id });
          }
        }
        if (tiles.length >= 60) break;
      }
      if (!tiles.some((t) => t.t !== "quote")) continue;
      sec.tiles = tiles;
    }
    if (type === "moment") {
      sec.button = str(s.button, 30);
      sec.after = str(s.after, 80);
    }
    if (type === "letter") {
      sec.photos = arr(s.photos).map(photo).filter((p): p is string => !!p).slice(0, 10);
      sec.big = arr(s.big).filter((n): n is number => typeof n === "number" && n >= 0 && n < 60).map(Math.round).slice(0, 8);
      sec.sign = str(s.sign, 40);
    }
    sections.push(sec);
  }
  const walls = sections.filter((s) => s.type === "wall");
  const left = photoIds.filter((p) => !placed.has(p));
  const spareClips = clipIds.filter((c) => !usedClips.has(c));
  if (left.length || spareClips.length || walls.length === 0) {
    const extra: Tile[] = [...left.map((p) => ({ t: "photo" as const, photo: p })), ...spareClips.map((c) => ({ t: "clip" as const, clip: c }))];
    if (walls.length) walls[walls.length - 1].tiles = [...(walls[walls.length - 1].tiles ?? []), ...extra];
    else if (extra.length) sections.unshift({ type: "wall", tiles: extra });
  }
  for (const type of ["moment", "letter", "details", "films", "wishes", "gift"] as const) {
    if (!sections.some((s) => s.type === type)) sections.push({ type });
  }

  const focus: Record<string, [number, number]> = {};
  const unit = (n: unknown, fallback: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);
  for (const [k, v] of Object.entries(obj(r.focus))) {
    if (okPhoto.has(k) && Array.isArray(v)) focus[k] = [unit(v[0], 0.5), unit(v[1], 0.35)];
  }

  const c = obj(r.count);
  const countValue = str(c.value, 9);
  const count = countValue && str(c.label, 40)
    ? {
        label: str(c.label, 40) as string,
        value: countValue,
        note: str(c.note, 90),
        rows: arr(c.rows).map((x) => ({ label: str(obj(x).label, 40) ?? "", value: str(obj(x).value, 22) ?? "" })).filter((x) => x.label && x.value).slice(0, 3),
      }
    : undefined;
  const o = obj(r.opener);
  const cl = obj(r.closing);
  const closingLines = arr(cl.lines).map((x) => str(x, 28)).filter((x): x is string => !!x).slice(0, 3);

  const design: SiteDesign = {
    v: 2,
    colors: tidyColors(r.colors),
    fonts: { display: pick(DISPLAY_FONTS, obj(r.fonts).display, "Anton"), body: pick(BODY_FONTS, obj(r.fonts).body, "DM Sans") },
    caps: r.caps === true,
    radius: pick(RADII, r.radius, "round"),
    hero: { layout, lines, accent: Math.min(lines.length - 1, Math.max(0, typeof h.accent === "number" ? Math.round(h.accent) : lines.length - 1)), sub: str(h.sub, 60), left: str(h.left, 40), right: str(h.right, 40), photo: heroPhoto },
    ticker: arr(r.ticker).map((x) => str(x, 26)).filter((x): x is string => !!x).slice(0, 10),
    opener: str(o.text, 260) ? { text: str(o.text, 260) as string, from: str(o.from, 30), to: str(o.to, 40) } : undefined,
    count,
    sections,
    closing: { lines: closingLines.length ? closingLines : lines, small: str(cl.small, 140), sign: str(cl.sign, 30) },
    focus,
    film: [],
    at: Date.now(),
    by,
  };
  design.film = tidyFilm(r.film, design, okPhoto, okClip);
  return design;
}

/** The film script. If the director gave none, or a broken one, a sound one is cut from the page itself. */
function tidyFilm(raw: unknown, d: SiteDesign, okPhoto: Set<string>, okClip: Set<string>): Scene[] {
  const scenes: Scene[] = [];
  for (const x of arr(raw)) {
    const s = obj(x);
    const kind = pick(SCENE_KINDS, s.kind, "photo");
    if (s.kind !== kind) continue;
    const scene: Scene = {
      kind,
      seconds: Math.min(10, Math.max(2.4, typeof s.seconds === "number" ? s.seconds : 4.5)),
      tone: s.tone ? pick(TONES, s.tone, "light") : undefined,
      photo: typeof s.photo === "string" && okPhoto.has(s.photo) ? s.photo : undefined,
      photos: arr(s.photos).filter((p): p is string => typeof p === "string" && okPhoto.has(p)).slice(0, 4),
      clip: typeof s.clip === "string" && okClip.has(s.clip) ? s.clip : undefined,
      text: str(s.text, 110),
      body: str(s.body, 150),
      meta: str(s.meta, 60),
      chip: str(s.chip, 28),
    };
    if (kind === "photo" && !scene.photo) continue;
    if (kind === "line" && (!scene.photo || !scene.text)) continue;
    if (kind === "wall" && (!scene.text || (scene.photos ?? []).length < 2)) continue;
    if (kind === "clip" && !scene.clip) continue;
    if (kind === "counter" && !d.count) continue;
    if (kind === "meet" && (d.ticker.length < 2 || (scene.photos ?? []).length < 2)) continue;
    // Give every line the time it takes to read it twice.
    const words = `${scene.text ?? ""} ${scene.body ?? ""}`.trim().split(/\s+/).filter(Boolean).length;
    if (kind === "line" || kind === "wall" || kind === "photo") scene.seconds = Math.max(scene.seconds, Math.min(9, 2.4 + words * 0.24));
    scenes.push(scene);
    if (scenes.length >= 32) break;
  }
  if (scenes.filter((s) => s.kind !== "title" && s.kind !== "closing").length < 4) return cutFilm(d);
  if (scenes[0].kind !== "title") scenes.unshift({ kind: "title", seconds: 4 });
  if (scenes[scenes.length - 1].kind !== "closing") scenes.push({ kind: "closing", seconds: 5, tone: "loud" });
  return scenes;
}

/** A film cut straight from the page: title, cover, counter, the wall in threes, the wish, the close. */
export function cutFilm(d: SiteDesign): Scene[] {
  const scenes: Scene[] = [{ kind: "title", seconds: 4 }];
  const faces = d.sections.flatMap((s) => s.tiles ?? []).filter((t): t is Extract<Tile, { t: "photo" }> => t.t === "photo").map((t) => t.photo);
  if (d.ticker.length >= 2 && faces.length >= 3) scenes.push({ kind: "meet", seconds: 5, photos: faces.slice(0, 4) });
  if (d.hero.photo) scenes.push({ kind: "photo", seconds: 4, photo: d.hero.photo, text: d.opener?.text.slice(0, 90) });
  if (d.count) scenes.push({ kind: "counter", seconds: 5 });
  const tiles = d.sections.filter((s) => s.type === "wall" && !s.hidden).flatMap((s) => s.tiles ?? []);
  const photos = tiles.filter((t): t is Extract<Tile, { t: "photo" }> => t.t === "photo").map((t) => t.photo).filter((p) => p !== d.hero.photo);
  const quotes = tiles.filter((t): t is Extract<Tile, { t: "quote" }> => t.t === "quote");
  let p = 0;
  quotes.slice(0, 8).forEach((q, i) => {
    if (i % 2 === 0 && p + 1 < photos.length) scenes.push({ kind: "wall", seconds: 4.5, text: q.text, meta: q.meta, chip: q.chip, photos: [photos[p++], photos[p++]] });
    else if (p < photos.length) scenes.push({ kind: "line", seconds: 4, tone: i % 4 === 1 ? "dark" : "light", text: q.text, meta: q.meta, chip: q.chip, photo: photos[p++] });
  });
  while (p < photos.length && scenes.length < 14) scenes.push({ kind: "photo", seconds: 3, photo: photos[p++] });
  const clip = tiles.find((t): t is Extract<Tile, { t: "clip" }> => t.t === "clip");
  if (clip) scenes.splice(Math.min(scenes.length, 5), 0, { kind: "clip", seconds: 5, clip: clip.clip });
  if (d.sections.some((s) => s.type === "moment" && !s.hidden)) scenes.push({ kind: "wish", seconds: 5, tone: "loud" });
  scenes.push({ kind: "closing", seconds: 5, tone: "loud" });
  return scenes;
}

export function filmSeconds(d: Pick<SiteDesign, "film">): number {
  return d.film.reduce((n, s) => n + s.seconds, 0);
}

type StarterPalette = { bg: string; card: string; ink: string; muted: string; accent: string };
const STARTER: Record<string, Pick<SiteDesign, "fonts" | "caps" | "radius"> & { hero: SiteDesign["hero"]["layout"] }> = {
  editorial: { fonts: { display: "Anton", body: "DM Sans" }, caps: false, radius: "round", hero: "poster" },
  owambe: { fonts: { display: "Cormorant Garamond", body: "DM Sans" }, caps: false, radius: "soft", hero: "split" },
  midnight: { fonts: { display: "Playfair Display", body: "Figtree" }, caps: false, radius: "soft", hero: "cover" },
  garden: { fonts: { display: "Fraunces", body: "Karla" }, caps: false, radius: "round", hero: "split" },
};
const OPENING: Record<string, string[]> = { birthday: ["Happy", "birthday,"], wedding: ["The wedding", "of"], anniversary: ["Happy", "anniversary,"] };

/** A design built from the standard look, so a customer can edit by hand without the AI art director. */
export function starterDesign(project: { siteStyle: string; occasion: string; names: string; headline?: string | null }, palette: StarterPalette, photoIds: string[], clipIds: string[]): SiteDesign {
  const look = STARTER[project.siteStyle] ?? STARTER.editorial;
  const dark = project.siteStyle === "midnight";
  const raw = {
    colors: dark ? { bg: "#12101a", card: "#1c1927", ink: "#f3effc", muted: "#a59fb7", loud: palette.accent } : { bg: palette.bg, card: palette.card, ink: palette.ink, muted: palette.muted, loud: palette.accent, loudDeep: palette.accent },
    fonts: look.fonts,
    caps: look.caps,
    radius: look.radius,
    hero: { layout: look.hero, lines: [...(OPENING[project.occasion] ?? []), `${project.names.slice(0, 26)}.`], sub: project.headline ?? undefined, photo: photoIds[0] },
    sections: [{ type: "wall", title: "The wall.", tiles: photoIds.map((p) => ({ t: "photo", photo: p })) }, { type: "moment" }, { type: "letter" }, { type: "details" }, { type: "films" }, { type: "wishes" }, { type: "gift" }],
    closing: { lines: [...(OPENING[project.occasion] ?? []), `${project.names.slice(0, 26)}.`] },
  };
  return tidyDesign(raw, photoIds, clipIds, "you") as SiteDesign;
}
