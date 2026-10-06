"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { PALETTES, SITE_STYLES } from "@convex/lib/constants";
import { BODY_FONTS, DISPLAY_FONTS, starterDesign, type DesignSection, type SiteDesign, type Tile } from "@convex/lib/design";
import { cleanError } from "@/lib/format";
import type { BuilderData, ProjectPatch } from "./shared";

const HERO_NAMES: Record<SiteDesign["hero"]["layout"], string> = { poster: "Big words only", split: "Words beside a photo", cover: "Words over a photo" };
const RADIUS_NAMES: Record<SiteDesign["radius"], string> = { round: "Round", soft: "Soft", sharp: "Sharp" };
const SECTION_NAMES: Record<DesignSection["type"], string> = { wall: "Photo wall", moment: "Candles or confetti", letter: "Your letter", details: "The day", films: "Your films", gift: "Gifts", wishes: "Wishes" };
const DEFAULT_TITLES: Record<DesignSection["type"], string> = { wall: "The wall.", moment: "Make a wish.", letter: "The letter.", details: "The day.", films: "The film.", gift: "Send a gift.", wishes: "Leave a wish." };

export function Look({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project, assets } = data;
  const saveDesign = useMutation(api.projects.saveDesign);
  const clearDesign = useMutation(api.projects.clearDesign);
  const server = (project.siteDesign?.v === 2 ? project.siteDesign : null) as SiteDesign | null;
  const [d, setD] = useState<SiteDesign | null>(server);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seen = useRef(server?.by === "ai" ? server.at : 0);
  const ids = (kind: "photo" | "video") => assets.filter((a) => a.kind === kind && a.url).sort((a, b) => a.order - b.order);
  const photos = ids("photo");
  const palette = PALETTES.find((p) => p.id === project.palette) ?? PALETTES[0];
  const paid = project.status === "paid";

  // A new design from the studio, or going back to the standard look, replaces what is on screen.
  useEffect(() => {
    if (!server) setD(null);
    else if (server.by === "ai" && server.at !== seen.current) { seen.current = server.at; setD(server); }
    else setD((cur) => cur ?? server);
  }, [server?.at, server?.by, !server]); // eslint-disable-line react-hooks/exhaustive-deps

  function change(next: SiteDesign) {
    setD(next);
    setState("saving");
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveDesign({ id: project._id, design: next }).then(() => setState("saved")).catch((e) => { setError(cleanError(e)); setState("idle"); });
    }, 600);
  }

  if (!d) {
    return (
      <div className="stack">
        <div className="director">
          <div className="grow">
            <b>{paid ? "The studio designs this for you" : "An art director designs your website after payment"}</b>
            <span>{paid ? "Go to the last step to see how far it has got." : "It studies your photos and words, picks the colors, the lettering and the layout, then checks its own work. Until then, choose a starting look below."}</span>
          </div>
        </div>
        <div className="part">
          <div className="part-h"><div><h3>Starting look</h3><p>What your preview looks like right now.</p></div></div>
          <div className="grid two">
            {SITE_STYLES.map((s) => (
              <button key={s.id} className={`opt ${project.siteStyle === s.id ? "on" : ""}`} onClick={() => void save({ siteStyle: s.id })}>
                <b>{s.name}</b>
                <div className="muted small">{s.blurb}</div>
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 12, marginTop: 16 }}>
            {PALETTES.map((p) => (
              <button key={p.id} title={p.name} aria-label={p.name} className={`swatch ${project.palette === p.id ? "on" : ""}`} style={{ background: p.accent }} onClick={() => void save({ palette: p.id })} />
            ))}
            <span className="muted small">{palette.name}</span>
          </div>
        </div>
        <div className="part">
          <div className="part-h">
            <div><h3>Design it by hand</h3><p>Start from a poster layout and change the colors, lettering, words and order yourself. Free, as many times as you like.</p></div>
            <button type="button" className="btn small" disabled={photos.length === 0} onClick={() => change(starterDesign(project, palette, photos.map((p) => p._id as string), ids("video").map((p) => p._id as string)))}>Open the editor</button>
          </div>
          {photos.length === 0 ? <div className="hint">Add your photos first.</div> : null}
        </div>
      </div>
    );
  }

  const color = (key: "bg" | "ink" | "loud" | "hi", label: string) => (
    <label className="colorpick">
      <input type="color" value={d.colors[key]} onChange={(e) => {
        const v = e.target.value;
        // The colours that sit on top of this one are worked out again, so words stay readable.
        const colors = key === "loud" ? { ...d.colors, loud: v, loudDeep: v, loudInk: "" } : key === "hi" ? { ...d.colors, hi: v, hiInk: "" } : key === "bg" ? { ...d.colors, bg: v, card: "", muted: "" } : { ...d.colors, ink: v };
        change({ ...d, colors });
      }} />
      <span>{label}</span>
    </label>
  );
  const section = (i: number, patch: Partial<DesignSection>) => change({ ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const move = (i: number, by: number) => {
    if (i + by < 0 || i + by >= d.sections.length) return;
    const list = [...d.sections];
    [list[i], list[i + by]] = [list[i + by], list[i]];
    change({ ...d, sections: list });
  };
  const tile = (i: number, k: number, patch: Partial<Extract<Tile, { t: "quote" }>> | null) =>
    section(i, { tiles: (d.sections[i].tiles ?? []).flatMap((t, j) => (j !== k ? [t] : patch === null ? [] : [{ ...t, ...patch } as Tile])) });
  const text = (label: string, value: string, set: (v: string) => void, max: number, placeholder?: string) => (
    <label className="field"><span>{label}</span><input type="text" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => set(e.target.value)} /></label>
  );

  return (
    <div className="editor">
      <div className="stack">
        <div className="explain">
          <span className="tag">Free to edit</span>
          <p>Change anything here as often as you like. It saves by itself and uses no credits. Your films keep the look they were made with. {state === "saving" ? "Saving…" : state === "saved" ? "Saved." : ""}</p>
        </div>
        {error ? <div className="err">{error}</div> : null}

        <div className="part">
          <div className="part-h"><div><h3>Colors</h3><p>One loud color does the shouting. If words become hard to read, we fix them for you.</p></div></div>
          <div className="row" style={{ gap: 18 }}>{color("bg", "Background")}{color("ink", "Words")}{color("loud", "Loud color")}{color("hi", "Highlighter")}</div>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>Lettering</h3></div></div>
          <div className="grid two">
            <label className="field"><span>Big words</span><select value={d.fonts.display} onChange={(e) => change({ ...d, fonts: { ...d.fonts, display: e.target.value as SiteDesign["fonts"]["display"] } })}>{DISPLAY_FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>
            <label className="field"><span>Everything else</span><select value={d.fonts.body} onChange={(e) => change({ ...d, fonts: { ...d.fonts, body: e.target.value as SiteDesign["fonts"]["body"] } })}>{BODY_FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>
          </div>
          <div className="pills light-ground" style={{ marginTop: 12 }}>
            <button className={d.caps ? "on" : ""} onClick={() => change({ ...d, caps: !d.caps })}>Capitals</button>
            {(Object.keys(RADIUS_NAMES) as SiteDesign["radius"][]).map((k) => <button key={k} className={d.radius === k ? "on" : ""} onClick={() => change({ ...d, radius: k })}>{RADIUS_NAMES[k]} corners</button>)}
          </div>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>Top of the page</h3><p>The first thing guests see. Keep each line short.</p></div></div>
          <div className="pills light-ground">
            {(Object.keys(HERO_NAMES) as SiteDesign["hero"]["layout"][]).map((k) => <button key={k} className={d.hero.layout === k ? "on" : ""} onClick={() => change({ ...d, hero: { ...d.hero, layout: k } })}>{HERO_NAMES[k]}</button>)}
          </div>
          <div className="grid" style={{ marginTop: 14 }}>
            {[0, 1, 2].map((n) => (
              <div key={n} className="row" style={{ gap: 8 }}>
                <input type="text" maxLength={28} value={d.hero.lines[n] ?? ""} placeholder={`Line ${n + 1}${n ? " (optional)" : ""}`} onChange={(e) => { const lines = [0, 1, 2].map((m) => (m === n ? e.target.value : d.hero.lines[m] ?? "")).filter((x, m) => x || m === 0); change({ ...d, hero: { ...d.hero, lines, accent: Math.min(d.hero.accent, lines.length - 1) } }); }} style={{ flex: 1 }} />
                {d.hero.lines[n] !== undefined ? <button className={`btn small ${d.hero.accent === n ? "" : "ghost"}`} onClick={() => change({ ...d, hero: { ...d.hero, accent: n } })}>{d.hero.accent === n ? "In color" : "Color this"}</button> : null}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>{text("Small line under it", d.hero.sub ?? "", (v) => change({ ...d, hero: { ...d.hero, sub: v } }), 60, "for real, all day")}</div>
          {d.hero.layout !== "poster" ? (
            <>
              <div className="hint" style={{ margin: "14px 0 8px" }}>Cover photo</div>
              <div className="cover-thumbs">
                {photos.map((p) => (
                  <button key={p._id} className={d.hero.photo === p._id ? "on" : ""} aria-label="Use as cover photo" onClick={() => change({ ...d, hero: { ...d.hero, photo: p._id as string } })}><img src={p.url as string} alt="" loading="lazy" /></button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="part">
          <div className="part-h"><div><h3>The moving strip and the opening</h3><p>The strip scrolls short words across the page. Separate them with commas.</p></div></div>
          {text("Words on the strip", d.ticker.join(", "), (v) => change({ ...d, ticker: v.split(",").map((x) => x.trimStart()) }), 240, "Yemisi, baby bear, my graduate")}
          <label className="field" style={{ marginTop: 12 }}><span>Opening card</span><textarea maxLength={260} value={d.opener?.text ?? ""} placeholder="One or two sentences that open the page." onChange={(e) => change({ ...d, opener: e.target.value ? { ...d.opener, text: e.target.value } : undefined })} /></label>
          <div className="grid two" style={{ marginTop: 12 }}>
            {text("Big number", d.count?.value ?? "", (v) => change({ ...d, count: v ? { label: d.count?.label ?? "Days", rows: d.count?.rows ?? [], ...d.count, value: v.replace(/\D/g, "") } : undefined }), 7, "669")}
            {text("What it counts", d.count?.label ?? "", (v) => d.count && change({ ...d, count: { ...d.count, label: v } }), 40, "Days with you, so far")}
          </div>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>The page, top to bottom</h3><p>Move parts up or down, rename them, or hide them. A part with nothing in it stays hidden by itself. To change the letter or the photos, use the Words and Photos steps.</p></div></div>
          <div className="secs">
            {d.sections.map((s, i) => (
              <div key={`${s.type}-${i}`} className={`secrow ${s.hidden ? "off" : ""}`}>
                <div className="arrows">
                  <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button aria-label="Move down" disabled={i === d.sections.length - 1} onClick={() => move(i, 1)}>↓</button>
                </div>
                <div className="grow">
                  <small>{SECTION_NAMES[s.type]}{s.type === "wall" ? ` · ${(s.tiles ?? []).filter((t) => t.t === "photo").length} photos` : ""}</small>
                  <input type="text" maxLength={40} value={s.title ?? ""} placeholder={DEFAULT_TITLES[s.type]} onChange={(e) => section(i, { title: e.target.value })} />
                  {s.type === "wall" ? (
                    <div className="lineedit">
                      <small style={{ marginTop: 10 }}>The lines between the photos</small>
                      {(s.tiles ?? []).map((t, k) => t.t === "quote" ? (
                        <span key={k} className="q"><input type="text" maxLength={130} value={t.text} onChange={(e) => tile(i, k, { text: e.target.value })} /><button className="btn ghost small" aria-label="Remove this line" onClick={() => tile(i, k, null)}>×</button></span>
                      ) : null)}
                      <div><button className="btn ghost small" onClick={() => { const tiles = [...(s.tiles ?? [])]; tiles.splice(Math.min(tiles.length, 2 + tiles.filter((t) => t.t === "quote").length * 3), 0, { t: "quote", text: "Write a line here" }); section(i, { tiles }); }}>Add a line</button></div>
                    </div>
                  ) : null}
                </div>
                <button className="btn ghost small" onClick={() => section(i, { hidden: !s.hidden })}>{s.hidden ? "Show" : "Hide"}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>The last words</h3><p>They end the letter, and they end your films.</p></div></div>
          {text("Big closing words", d.closing.lines.join(" / "), (v) => change({ ...d, closing: { ...d.closing, lines: v.split("/").map((x) => x.trim()).filter(Boolean).slice(0, 3) } }), 90, "Happy birthday, / baby bear.")}
          <div className="grid two" style={{ marginTop: 12 }}>
            {text("Small line", d.closing.small ?? "", (v) => change({ ...d, closing: { ...d.closing, small: v } }), 140)}
            {text("Signed", d.closing.sign ?? "", (v) => change({ ...d, closing: { ...d.closing, sign: v } }), 30)}
          </div>
        </div>

        <div><button type="button" className="linkish" onClick={() => { if (timer.current) clearTimeout(timer.current); void clearDesign({ id: project._id }); }}>Go back to the standard look</button></div>
      </div>

      <aside className="editor-phone">
        <div className="phone-frame"><iframe title="Your website" src={`/app/preview/${project.slug}`} /></div>
        <a className="btn ghost small" href={`/app/preview/${project.slug}`} target="_blank" rel="noreferrer">Open full size</a>
      </aside>
    </div>
  );
}
