"use client";

import { useState } from "react";
import { PALETTES, SITE_STYLES } from "@convex/lib/constants";
import type { Textile } from "@/lib/textile";
import { PhoneSite, type PhoneLook } from "./PhoneSite";

const STYLE: Record<string, { font: string; radius: string; caps?: boolean; textile: Textile; cloth: string }> = {
  editorial: { font: "Anton, Impact, sans-serif", radius: "10px", caps: true, textile: "kente", cloth: "#2a2e86" },
  owambe: { font: "'Cormorant Garamond', Georgia, serif", radius: "2px", textile: "asooke", cloth: "#7a4b0b" },
  midnight: { font: "Anton, Impact, sans-serif", radius: "12px", caps: true, textile: "adire", cloth: "#10143f" },
  garden: { font: "'DM Sans', system-ui, sans-serif", radius: "16px", textile: "ankara", cloth: "#1d6b4d" },
};

export function StyleShowcase() {
  const [style, setStyle] = useState<string>("owambe");
  const [pal, setPal] = useState<string>("gold");
  const p = PALETTES.find((x) => x.id === pal) ?? PALETTES[0];
  const dark = style === "midnight";
  const s = STYLE[style];
  const look: PhoneLook = {
    a: p.accent,
    b: dark ? "#2b2340" : p.accent2,
    bg: dark ? "#0d0a16" : p.bg,
    ink: dark ? "#f4f0ff" : p.ink,
    card: dark ? "#171226" : p.card,
    font: s.font,
    radius: s.radius,
    caps: s.caps,
    textile: s.textile,
    cloth: dark ? s.cloth : p.accent,
    thread: dark ? "#8f97e8" : p.accent2,
  };
  return (
    <div className="styles-grid">
      <div>
        <div className="style-list" role="radiogroup" aria-label="Website style">
          {SITE_STYLES.map((x) => (
            <button key={x.id} role="radio" aria-checked={style === x.id} className={`style-pick${style === x.id ? " on" : ""}`} onClick={() => setStyle(x.id)}>
              <span className="dots"><i style={{ background: p.accent }} /><i style={{ background: x.id === "midnight" ? "#2b2340" : p.accent2 }} /></span>
              <span><b>{x.name}</b><span className="d">{x.blurb}</span></span>
            </button>
          ))}
        </div>
        <div className="palette-row" role="radiogroup" aria-label="Color scheme">
          {PALETTES.map((c) => (
            <button key={c.id} role="radio" aria-checked={pal === c.id} aria-label={c.name} className={`swatch${pal === c.id ? " on" : ""}`} style={{ background: c.accent }} onClick={() => setPal(c.id)} />
          ))}
        </div>
      </div>
      <PhoneSite look={look} />
    </div>
  );
}
