import type { CSSProperties } from "react";

export type PhoneLook = { a: string; b: string; bg: string; ink: string; card: string; font: string; radius: string; caps?: boolean };

/** A small stand-in for a finished celebration website. Used on the landing page and creator pages. */
export function PhoneSite({ look, float = false, names = "Tolu & Bisi" }: { look: PhoneLook; float?: boolean; names?: string }) {
  const vars = { "--p-a": look.a, "--p-b": look.b, "--p-bg": look.bg, "--p-ink": look.ink, "--p-card": look.card, "--p-font": look.font, "--p-r": look.radius } as CSSProperties;
  return (
    <div className={`phone${float ? " float" : " still"}`} style={vars} aria-hidden="true">
      <span className="notch" />
      <div className="scr">
        <div className="cov">
          <div>
            <small>Wedding · 14 Feb</small>
            <b style={look.caps ? { textTransform: "uppercase", letterSpacing: "0.02em" } : undefined}>{names}</b>
            <i>43 days to go</i>
          </div>
        </div>
        <div className="bd">
          <div className="tiles"><i /><i /><i /></div>
          <div className="wishcard"><b>Aunty Funmi</b>May your home overflow with joy.</div>
          <div className="wishcard w2"><b>Kunle</b>Congratulations, my people.</div>
        </div>
      </div>
    </div>
  );
}
