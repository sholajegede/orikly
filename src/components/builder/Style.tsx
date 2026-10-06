"use client";

import { PALETTES, SITE_STYLES, VIDEO_STYLES } from "@convex/lib/constants";
import type { BuilderData, ProjectPatch } from "./shared";

export function Style({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project } = data;
  const palette = PALETTES.find((p) => p.id === project.palette) ?? PALETTES[0];

  function toggleVideoStyle(id: string) {
    const cur = project.videoStyles;
    if (cur.includes(id)) return;
    void save({ videoStyles: [cur[1], id] });
  }

  return (
    <div className="stack">
      <div>
        <h3 style={{ fontSize: 20, marginBottom: 10 }}>Website style</h3>
        <div className="grid two">
          {SITE_STYLES.map((s) => (
            <button key={s.id} className={`opt ${project.siteStyle === s.id ? "on" : ""}`} onClick={() => void save({ siteStyle: s.id })}>
              <b>{s.name}</b>
              <div className="muted small">{s.blurb}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 20, marginBottom: 10 }}>Color scheme</h3>
        <div className="row" style={{ gap: 12 }}>
          {PALETTES.map((p) => (
            <button key={p.id} title={p.name} aria-label={p.name} className={`swatch ${project.palette === p.id ? "on" : ""}`} style={{ background: p.accent }} onClick={() => void save({ palette: p.id })} />
          ))}
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>{palette.name}</div>
      </div>

      <div
        className="site"
        data-style={project.siteStyle}
        style={{
          ["--bg" as string]: project.siteStyle === "midnight" ? undefined : palette.bg,
          ["--card" as string]: project.siteStyle === "midnight" ? undefined : palette.card,
          ["--ink" as string]: project.siteStyle === "midnight" ? undefined : palette.ink,
          ["--accent" as string]: palette.accent,
          ["--on-accent" as string]: palette.onAccent,
          minHeight: 0,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ padding: 24, background: "var(--bg)", color: "var(--ink)" }}>
          <div className="eyebrow" style={{ color: "var(--accent)" }}>{project.occasion}</div>
          <div className="names" style={{ fontSize: 56, color: "var(--ink)" }}>{project.names}</div>
          <span className="chip accent">Preview of your style</span>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 20, marginBottom: 4 }}>Your two videos</h3>
        <p className="muted small" style={{ margin: "0 0 10px" }}>Pick 2 different styles. Each comes for WhatsApp status (tall) and for a big screen (wide).</p>
        <div className="grid three">
          {VIDEO_STYLES.map((s) => (
            <button key={s.id} className={`opt ${project.videoStyles.includes(s.id) ? "on" : ""}`} onClick={() => toggleVideoStyle(s.id)}>
              <b>{s.name}</b>
              <div className="muted small">{s.blurb}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
