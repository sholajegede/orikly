import type { CSSProperties } from "react";
import { textileSize, textileUrl, type Textile } from "@/lib/textile";

export type PhoneLook = { a: string; b: string; bg: string; ink: string; card: string; font: string; radius: string; caps?: boolean; textile: Textile; cloth: string; thread: string };

/** A small stand-in for a finished celebration website. The cover is woven cloth, not a photo. */
export function PhoneSite({ look, names = "Tolu & Bisi" }: { look: PhoneLook; names?: string }) {
  const vars = { "--p-a": look.a, "--p-b": look.b, "--p-bg": look.bg, "--p-ink": look.ink, "--p-card": look.card, "--p-font": look.font, "--p-r": look.radius } as CSSProperties;
  const cover: CSSProperties = { backgroundImage: textileUrl(look.textile, look.thread, look.cloth), backgroundSize: textileSize(look.textile, 1.1) };
  const tile = (i: number): CSSProperties => ({ backgroundImage: textileUrl(look.textile, look.thread, look.cloth, 0.55), backgroundSize: textileSize(look.textile, 0.55), backgroundPosition: `${i * 9}px ${i * 5}px` });
  return (
    <div className="phone" style={vars} aria-hidden="true">
      <span className="notch" />
      <div className="scr">
        <div className="cov" style={cover}>
          <div>
            <small>Wedding · 14 Feb</small>
            <b style={look.caps ? { textTransform: "uppercase", letterSpacing: "0.02em" } : undefined}>{names}</b>
            <i>43 days to go</i>
          </div>
        </div>
        <div className="bd">
          <div className="tiles"><i style={tile(0)} /><i style={tile(1)} /><i style={tile(2)} /></div>
          <div className="wishcard"><b>Aunty Funmi</b>May your home overflow with joy.</div>
        </div>
      </div>
    </div>
  );
}
