"use client";

import { useState } from "react";
import { PALETTES, SITE_STYLES } from "@convex/lib/constants";
import { PhoneSite, type PhoneLook } from "./PhoneSite";

const FONT: Record<string, { font: string; radius: string; caps?: boolean }> = {
  editorial: { font: "Anton, Impact, sans-serif", radius: "10px", caps: true },
  owambe: { font: "'Cormorant Garamond', Georgia, serif", radius: "2px" },
  midnight: { font: "Anton, Impact, sans-serif", radius: "12px", caps: true },
  garden: { font: "'DM Sans', system-ui, sans-serif", radius: "16px" },
};

export function StyleShowcase() {
  const [style, setStyle] = useState<string>("owambe");
  const [pal, setPal] = useState<string>("gold");
  const p = PALETTES.find((x) => x.id === pal) ?? PALETTES[0];
  const dark = style === "midnight";
  const f = FONT[style];
  const look: PhoneLook = {
    a: p.accent,
    b: dark ? "#2b2340" : p.accent2,
    bg: dark ? "#0d0a16" : p.bg,
    ink: dark ? "#f4f0ff" : p.ink,
    card: dark ? "#171226" : p.card,
    font: f.font,
    radius: f.radius,
    caps: f.caps,
  };
  return (
    <div className="styles-grid">
      <div>
        <div className="style-list" role="radiogroup" aria-label="Website style">
          {SITE_STYLES.map((s) => (
            <button key={s.id} role="radio" aria-checked={style === s.id} className={`style-pick${style === s.id ? " on" : ""}`} onClick={() => setStyle(s.id)}>
              <span className="dots"><i style={{ background: p.accent }} /><i style={{ background: s.id === "midnight" ? "#2b2340" : p.accent2 }} /></span>
              <span><b>{s.name}</b><span className="d">{s.blurb}</span></span>
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
