"use client";

import { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { filmSeconds, type SiteDesign } from "@convex/lib/design";
import { cleanError } from "@/lib/format";
import { FILM_FPS, FILM_SIZE, Film, type FilmData, type FilmFormat } from "@/remotion/Film";
import type { BuilderData } from "./shared";

const STEPS = [
  { at: ["queued", "designing"], title: "Designing your website", about: "The art director studies every photo and your words, then designs the page around them." },
  { at: ["reviewing"], title: "Looking it over, twice", about: "It photographs the website on a phone and a laptop, finds what is weak and fixes it." },
  { at: ["filming"], title: "Rendering your two films", about: "One tall for WhatsApp status, one wide for a big screen, cut to your song." },
];

/** The studio's progress, the film preview, and the one free redo. Everything here runs without the customer. */
export function Studio({ data }: { data: BuilderData }) {
  const { project, assets, songUrl } = data;
  const on = useQuery(api.studio.available);
  const redo = useMutation(api.studio.redo);
  const [shape, setShape] = useState<FilmFormat>("portrait");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = project.status === "paid";
  const s = project.studio;
  const design = (project.siteDesign?.v === 2 ? project.siteDesign : null) as SiteDesign | null;
  const working = !!s && s.stage !== "done" && s.stage !== "failed";
  const step = s ? STEPS.findIndex((x) => x.at.includes(s.stage)) : -1;
  const key = assets.map((a) => a._id).join(",");
  const film: FilmData | null = useMemo(() => {
    if (!design) return null;
    const pick = (kind: "photo" | "video") => assets.filter((a) => a.kind === kind && a.url).map((a) => ({ id: a._id as string, url: a.url as string }));
    const moment = design.sections.find((x) => x.type === "moment");
    return { design, names: project.names, occasion: project.occasion, eventDate: project.eventDate ?? null, momentTitle: moment?.title, momentAfter: moment?.after, photos: pick("photo"), clips: pick("video"), songUrl };
  }, [design?.at, key, songUrl, project.names, project.eventDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setBusy(true);
    setError(null);
    void redo({ id: project._id }).catch((e) => setError(cleanError(e))).finally(() => setBusy(false));
  };

  if (assets.filter((a) => a.kind === "photo").length < 3) return null;
  if (!paid) {
    return (
      <div className="director">
        <div className="grow">
          <b>Your designed website and two films are made after payment</b>
          <span>An art director studies every photo and your words, designs the website, checks its own work, then renders a tall and a wide film to your song. It takes about ten minutes and you do not have to wait on this page.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card stack" style={{ gap: 16 }}>
      <div className="row between">
        <h3 style={{ fontSize: 24 }}>The studio</h3>
        {film ? (
          <div className="pills light-ground">
            <button className={shape === "portrait" ? "on" : ""} onClick={() => setShape("portrait")}>Tall</button>
            <button className={shape === "landscape" ? "on" : ""} onClick={() => setShape("landscape")}>Wide</button>
          </div>
        ) : null}
      </div>

      {working ? (
        <div className="studio-steps">
          {STEPS.map((x, i) => (
            <div key={x.title} className={i < step ? "was" : i === step ? "now" : ""}>
              <i>{i < step ? "✓" : i + 1}</i>
              <div><b>{x.title}{i === step && s?.note ? ` · ${s.note}` : ""}</b><span>{x.about}</span></div>
            </div>
          ))}
          <p className="muted small" style={{ margin: 0 }}>You can close this page. The studio carries on without you, and everything appears here when it is ready.</p>
        </div>
      ) : null}

      {s?.stage === "failed" ? <div className="err">The studio stopped: {s.note ?? "something went wrong"}. Nothing was charged for this run.</div> : null}

      {film ? (
        <div className={`film-stage ${shape}`}>
          <Player key={`${shape}-${design?.at}`} component={Film} inputProps={{ data: film, format: shape }} durationInFrames={Math.max(30, Math.round(filmSeconds(film.design) * FILM_FPS))} fps={FILM_FPS} compositionWidth={FILM_SIZE[shape].width} compositionHeight={FILM_SIZE[shape].height} controls style={{ width: "100%", height: "100%" }} />
        </div>
      ) : null}
      {film && s?.stage === "done" ? <p className="muted small" style={{ margin: 0 }}>This is your film playing live. The finished files are under Downloads, and the website has its new design: <a href={`/app/preview/${project.slug}`} target="_blank" rel="noreferrer"><b>open it</b></a>. You can change the website by hand in the Look step, free.</p> : null}

      {on === false ? <p className="muted" style={{ margin: 0 }}>The studio is being switched on. Check back shortly.</p> : null}
      {!working && on !== false ? (
        <div className="row">
          {!s ? <button className="btn hot" disabled={busy} onClick={start}>{busy ? "Starting…" : "Make my website and films"}</button> : null}
          {s?.stage === "failed" ? <button className="btn hot" disabled={busy} onClick={start}>{busy ? "Starting…" : "Try again"}</button> : null}
          {s?.stage === "done" && s.runs < 2 ? <button className="btn ghost" disabled={busy} onClick={start}>{busy ? "Starting…" : "Make a different design and film (1 free redo)"}</button> : null}
          {s?.stage === "done" && s.runs >= 2 ? <span className="muted small">Your free redo is used.</span> : null}
        </div>
      ) : null}
      {error ? <div className="err">{error}</div> : null}
    </div>
  );
}
