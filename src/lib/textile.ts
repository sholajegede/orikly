export type Textile = "adire" | "asooke" | "ankara" | "kente";

type Tile = { w: number; h: number; body: (fg: string, bg: string) => string };

const TILES: Record<Textile, Tile> = {
  // Resist-dyed indigo cloth: rings and dots on a grid.
  adire: {
    w: 48,
    h: 48,
    body: (fg, bg) =>
      `<rect width="48" height="48" fill="${bg}"/>` +
      `<circle cx="24" cy="24" r="15" fill="none" stroke="${fg}" stroke-width="2.2"/>` +
      `<circle cx="24" cy="24" r="9" fill="none" stroke="${fg}" stroke-width="1.4" stroke-dasharray="2.5 2.5"/>` +
      `<circle cx="24" cy="24" r="3.4" fill="${fg}"/>` +
      `<path d="M0 0l7 7M48 0l-7 7M0 48l7-7M48 48l-7-7" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="0" cy="24" r="2" fill="${fg}"/><circle cx="48" cy="24" r="2" fill="${fg}"/><circle cx="24" cy="0" r="2" fill="${fg}"/><circle cx="24" cy="48" r="2" fill="${fg}"/>`,
  },
  // Hand-woven aso-oke strips: bands of different widths with thin weft threads.
  asooke: {
    w: 56,
    h: 28,
    body: (fg, bg) =>
      `<rect width="56" height="28" fill="${bg}"/>` +
      `<rect x="0" width="10" height="28" fill="${fg}" opacity="0.9"/>` +
      `<rect x="14" width="3" height="28" fill="${fg}"/>` +
      `<rect x="21" width="14" height="28" fill="${fg}" opacity="0.35"/>` +
      `<rect x="39" width="3" height="28" fill="${fg}"/>` +
      `<rect x="46" width="8" height="28" fill="${fg}" opacity="0.7"/>` +
      `<path d="M0 7h56M0 21h56" stroke="${bg}" stroke-width="1" opacity="0.5"/>`,
  },
  // Ankara wax print: overlapping scallops with a centre dot.
  ankara: {
    w: 40,
    h: 24,
    body: (fg, bg) =>
      `<rect width="40" height="24" fill="${bg}"/>` +
      `<g fill="none" stroke="${fg}" stroke-width="2">` +
      `<circle cx="20" cy="24" r="18"/><circle cx="20" cy="24" r="12"/><circle cx="20" cy="24" r="6"/>` +
      `<circle cx="0" cy="12" r="18"/><circle cx="0" cy="12" r="12"/><circle cx="0" cy="12" r="6"/>` +
      `<circle cx="40" cy="12" r="18"/><circle cx="40" cy="12" r="12"/><circle cx="40" cy="12" r="6"/>` +
      `</g><circle cx="20" cy="12" r="2.4" fill="${fg}"/>`,
  },
  // Kente: woven blocks with a checker and a diagonal weave.
  kente: {
    w: 48,
    h: 48,
    body: (fg, bg) =>
      `<rect width="48" height="48" fill="${bg}"/>` +
      `<rect width="24" height="24" fill="${fg}"/>` +
      `<rect x="24" y="24" width="24" height="24" fill="${fg}" opacity="0.55"/>` +
      `<path d="M24 0l24 24M0 24l24 24" stroke="${fg}" stroke-width="3"/>` +
      `<rect x="9" y="9" width="6" height="6" fill="${bg}"/>`,
  },
};

/** A seamless textile tile as an SVG data URL. */
export function textileDataUrl(kind: Textile, fg: string, bg: string, scale = 1): string {
  const t = TILES[kind];
  const w = t.w * scale;
  const h = t.h * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${t.w} ${t.h}">${t.body(fg, bg)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The same tile as a CSS background-image value. */
export function textileUrl(kind: Textile, fg: string, bg: string, scale = 1): string {
  return `url("${textileDataUrl(kind, fg, bg, scale)}")`;
}

export function textileSize(kind: Textile, scale = 1): string {
  const t = TILES[kind];
  return `${t.w * scale}px ${t.h * scale}px`;
}
