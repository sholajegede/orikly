"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { PALETTES, SITE_STYLES, VIDEO_STYLES } from "@convex/lib/constants";
import { BODY_FONTS, DISPLAY_FONTS, GALLERY_LAYOUTS, MOTIFS, STORY_LAYOUTS, starterDesign, type DesignSection, type SiteDesign } from "@convex/lib/design";
import { cleanError } from "@/lib/format";
import type { BuilderData, ProjectPatch } from "./shared";

const HERO_NAMES: Record<SiteDesign["hero"]["variant"], string> = { full: "Full photo", split: "Side by side", stack: "Names first", collage: "Three photos" };
const NAME_STYLES: Record<SiteDesign["namesStyle"], string> = { plain: "Plain", italic: "Slanted", upper: "Capitals" };
const MOTIF_NAMES: Record<SiteDesign["motif"], string> = { none: "None", adire: "Adire", asooke: "Aso-oke", ankara: "Ankara", kente: "Kente" };
const SECTION_NAMES: Record<DesignSection["type"], string> = { story: "Your story", quote: "Quote", numbers: "Numbers", gallery: "Photos", details: "The day", videos: "Videos", moment: "Candles or confetti", note: "Your note", gift: "Gifts", wishes: "Wishes" };
const LAYOUT_NAMES: Record<string, string> = { masonry: "Mixed sizes", grid: "Even squares", filmstrip: "Swipe sideways", featured: "One big, rest small", wall: "Wall of snapshots", plain: "Simple", dropcap: "Big first letter", side: "Photo beside it" };
const DEFAULT_TITLES: Record<DesignSection["type"], string> = { story: "Our story", quote: "", numbers: "In numbers", gallery: "Moments", details: "The day", videos: "Watch", moment: "Celebrate", note: "A note", gift: "Send a gift", wishes: "Wishes" };

export function Look({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project, assets } = data;
  const saveDesign = useMutation(api.projects.saveDesign);
  const clearDesign = useMutation(api.projects.clearDesign);
  const server = (project.siteDesign ?? null) as SiteDesign | null;
  const [d, setD] = useState<SiteDesign | null>(server);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seen = useRef(server?.by === "ai" ? server.at : 0);
  const photos = assets.filter((a) => a.kind === "photo" && a.url).sort((a, b) => a.order - b.order);
  const palette = PALETTES.find((p) => p.id === project.palette) ?? PALETTES[0];
  const paid = project.status === "paid";

  // A new design from the designer, or going back to the standard look, replaces what is on screen.
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
    }, 500);
  }
  const section = (i: number, patch: Partial<DesignSection>) => d && change({ ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const move = (i: number, by: number) => {
    if (!d || i + by < 0 || i + by >= d.sections.length) return;
    const list = [...d.sections];
    [list[i], list[i + by]] = [list[i + by], list[i]];
    change({ ...d, sections: list });
  };

  function toggleVideoStyle(id: string) {
    const cur = project.videoStyles;
    if (cur.includes(id)) return;
    void save({ videoStyles: [cur[1], id] });
  }

  const videoStyles = (
    <div className="part">
      <div className="part-h"><div><h3>Your two videos</h3><p>Pick 2 different styles. You get each video tall for WhatsApp status and wide for a big screen.</p></div></div>
      <div className="grid three">
        {VIDEO_STYLES.map((s) => (
          <button key={s.id} className={`opt ${project.videoStyles.includes(s.id) ? "on" : ""}`} onClick={() => toggleVideoStyle(s.id)}>
            <b>{s.name}</b>
            <div className="muted small">{s.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (!d) {
    return (
      <div className="stack">
        <div className="director">
          <div className="grow">
            <b>{paid ? "Your designer is ready" : "A designer builds your website after payment"}</b>
            <span>{paid ? "Go to the last step and tap the button there. It studies your photos and words and designs the whole website around them." : "It studies your photos and words, then picks the colors, the lettering and the layout for you. Until then, choose a starting look below."}</span>
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
            <div><h3>Edit it by hand</h3><p>Change colors, lettering, the top photo and the order of the page yourself. Free, as many times as you like.</p></div>
            <button type="button" className="btn small" disabled={photos.length === 0} onClick={() => change(starterDesign(project.siteStyle, palette, photos.map((p) => p._id as string)))}>Open the editor</button>
          </div>
          {photos.length === 0 ? <div className="hint">Add your photos first.</div> : null}
        </div>
        {videoStyles}
      </div>
    );
  }

  const color = (key: "bg" | "ink" | "accent", label: string) => (
    <label className="colorpick"><input type="color" value={d.colors[key]} onChange={(e) => change({ ...d, colors: { ...d.colors, [key]: e.target.value } })} /><span>{label}</span></label>
  );

  return (
    <div className="editor">
      <div className="stack">
        <div className="explain">
          <span className="tag">Free to edit</span>
          <p>Change anything here as often as you like. It saves by itself and uses no credits. {state === "saving" ? "Saving…" : state === "saved" ? "Saved." : ""}</p>
        </div>
        {error ? <div className="err">{error}</div> : null}

        <div className="part">
          <div className="part-h"><div><h3>Colors</h3><p>If words become hard to read on a color, we fix the words for you.</p></div></div>
          <div className="row" style={{ gap: 18 }}>{color("bg", "Background")}{color("ink", "Words")}{color("accent", "Accent")}</div>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>Lettering</h3></div></div>
          <div className="grid two">
            <label className="field"><span>Names and headings</span><select value={d.fonts.display} onChange={(e) => change({ ...d, fonts: { ...d.fonts, display: e.target.value as SiteDesign["fonts"]["display"] } })}>{DISPLAY_FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>
            <label className="field"><span>Everything else</span><select value={d.fonts.body} onChange={(e) => change({ ...d, fonts: { ...d.fonts, body: e.target.value as SiteDesign["fonts"]["body"] } })}>{BODY_FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>
          </div>
          <div className="pills light-ground" style={{ marginTop: 12 }}>
            {(Object.keys(NAME_STYLES) as SiteDesign["namesStyle"][]).map((k) => <button key={k} className={d.namesStyle === k ? "on" : ""} onClick={() => change({ ...d, namesStyle: k })}>{NAME_STYLES[k]}</button>)}
          </div>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>Top of the page</h3><p>The first thing guests see.</p></div></div>
          <div className="pills light-ground">
            {(Object.keys(HERO_NAMES) as SiteDesign["hero"]["variant"][]).map((k) => (
              <button key={k} className={d.hero.variant === k ? "on" : ""} disabled={k === "collage" && photos.length < 3}
                onClick={() => change({ ...d, hero: { ...d.hero, variant: k, extra: k === "collage" && (d.hero.extra ?? []).length < 2 ? photos.map((p) => p._id as string).filter((id) => id !== d.hero.photo).slice(0, 2) : d.hero.extra } })}>{HERO_NAMES[k]}</button>
            ))}
          </div>
          <div className="hint" style={{ margin: "14px 0 8px" }}>Cover photo</div>
          <div className="cover-thumbs">
            {photos.map((p) => (
              <button key={p._id} className={d.hero.photo === p._id ? "on" : ""} aria-label="Use as cover photo" onClick={() => change({ ...d, hero: { ...d.hero, photo: p._id as string, fx: 0.5, fy: 0.35, extra: (d.hero.extra ?? []).filter((x) => x !== p._id) } })}><img src={p.url as string} alt="" loading="lazy" /></button>
            ))}
          </div>
          <label className="field" style={{ marginTop: 14 }}><span>Small line above the names</span><input type="text" maxLength={50} value={d.hero.kicker ?? ""} placeholder="Together with their families" onChange={(e) => change({ ...d, hero: { ...d.hero, kicker: e.target.value } })} /></label>
          <label className="field" style={{ marginTop: 12 }}><span>Line under the names</span><input type="text" maxLength={140} value={d.hero.tagline ?? ""} placeholder={project.headline ?? "Come and celebrate with us"} onChange={(e) => change({ ...d, hero: { ...d.hero, tagline: e.target.value } })} /></label>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>Cloth pattern</h3><p>A woven band across the page, in your accent color.</p></div></div>
          <div className="pills light-ground">{MOTIFS.map((m) => <button key={m} className={d.motif === m ? "on" : ""} onClick={() => change({ ...d, motif: m })}>{MOTIF_NAMES[m]}</button>)}</div>
        </div>

        <div className="part">
          <div className="part-h"><div><h3>The page, top to bottom</h3><p>Move parts up or down, rename them, or hide them. A part with nothing in it stays hidden by itself. To change the words or photos, use the Words and Photos steps.</p></div></div>
          <div className="secs">
            {d.sections.map((s, i) => (
              <div key={`${s.type}-${i}`} className={`secrow ${s.hidden ? "off" : ""}`}>
                <div className="arrows">
                  <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button aria-label="Move down" disabled={i === d.sections.length - 1} onClick={() => move(i, 1)}>↓</button>
                </div>
                <div className="grow">
                  <small>{SECTION_NAMES[s.type]}{s.type === "gallery" ? ` · ${(s.photos ?? []).length}` : ""}</small>
                  {s.type === "quote"
                    ? <input type="text" maxLength={220} value={s.text ?? ""} onChange={(e) => section(i, { text: e.target.value })} />
                    : s.type === "numbers"
                    ? <div className="numedit">{(s.items ?? []).map((x, k) => (
                        <span key={k}>
                          <input type="text" maxLength={14} aria-label="Number" value={x.value} onChange={(e) => section(i, { items: (s.items ?? []).map((y, m) => (m === k ? { ...y, value: e.target.value } : y)) })} />
                          <input type="text" maxLength={48} aria-label="What it counts" value={x.label} onChange={(e) => section(i, { items: (s.items ?? []).map((y, m) => (m === k ? { ...y, label: e.target.value } : y)) })} />
                        </span>
                      ))}</div>
                    : <input type="text" maxLength={60} value={s.title ?? ""} placeholder={DEFAULT_TITLES[s.type]} onChange={(e) => section(i, { title: e.target.value })} />}
                  {s.type === "gallery" || s.type === "story" ? (
                    <select value={s.layout ?? (s.type === "gallery" ? "masonry" : "plain")} onChange={(e) => section(i, { layout: e.target.value, ...(s.type === "story" && e.target.value === "side" && !s.photo ? { photo: photos.find((p) => p._id !== d.hero.photo)?._id as string | undefined } : {}) })}>
                      {(s.type === "gallery" ? GALLERY_LAYOUTS : STORY_LAYOUTS).map((l) => <option key={l} value={l}>{LAYOUT_NAMES[l]}</option>)}
                    </select>
                  ) : null}
                  {s.type === "gallery" && s.layout === "wall" ? (
                    <div className="lineedit">
                      <small style={{ marginTop: 10 }}>The line on the back of each photo</small>
                      {(s.photos ?? []).map((id, k) => {
                        const ph = photos.find((p) => p._id === id);
                        return ph ? (
                          <span key={id}><img src={ph.url as string} alt="" loading="lazy" /><input type="text" maxLength={120} placeholder="Leave empty for no line" value={(s.lines ?? [])[k] ?? ""} onChange={(e) => section(i, { lines: (s.photos ?? []).map((_, m) => (m === k ? e.target.value : (s.lines ?? [])[m] ?? "")) })} /></span>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                </div>
                <button className="btn ghost small" onClick={() => section(i, { hidden: !s.hidden })}>{s.hidden ? "Show" : "Hide"}</button>
              </div>
            ))}
          </div>
        </div>

        {videoStyles}

        <div><button type="button" className="linkish" onClick={() => { if (timer.current) clearTimeout(timer.current); void clearDesign({ id: project._id }); }}>Go back to the standard look</button></div>
      </div>

      <aside className="editor-phone">
        <div className="phone-frame"><iframe title="Your website" src={`/app/preview/${project.slug}`} /></div>
        <a className="btn ghost small" href={`/app/preview/${project.slug}`} target="_blank" rel="noreferrer">Open full size</a>
      </aside>
    </div>
  );
}
