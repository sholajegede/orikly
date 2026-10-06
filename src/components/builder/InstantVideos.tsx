"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PALETTES } from "@convex/lib/constants";
import { cleanError, prettyDate } from "@/lib/format";
import { loadPhoto, recordReel, recordingSupport, type ReelFormat, type ReelPhoto, type ReelPlan, type ReelScene, type ReelShot, type ReelStyle } from "@/lib/reel";
import { uploadToStorage } from "@/lib/upload";
import { useTrack } from "@/lib/track";
import { ReelPlayer } from "@/components/ReelPlayer";
import type { BuilderData } from "./shared";

const media = (url: string) => `/api/media?u=${encodeURIComponent(url)}`;
const OCCASION: Record<string, string> = { wedding: "Wedding", birthday: "Birthday", anniversary: "Anniversary" };
const asStyle = (s: string | undefined): ReelStyle => (s === "reel" || s === "storybook" ? s : "cinematic");
const RUNS = 2;

/**
 * The customer's two videos. An AI director plans them from the photos and words (after payment, because it costs
 * AI credits), then this browser plays the plan with the song and saves both shapes.
 */
export function InstantVideos({ data }: { data: BuilderData }) {
  const { project, assets, songUrl, deliverables } = data;
  const aiOn = useQuery(api.director.available);
  const direct = useAction(api.director.direct);
  const genUrl = useMutation(api.assets.generateUploadUrl);
  const save = useMutation(api.projects.addInstantVideo);
  const track = useTrack();
  const [directing, setDirecting] = useState(false);
  const [photos, setPhotos] = useState<ReelPhoto[] | null>(null);
  const [loadedIds, setLoadedIds] = useState<string[]>([]);
  const [shape, setShape] = useState<ReelFormat>("portrait");
  const [stage, setStage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const paid = project.status === "paid";
  const stored = project.videoPlan as (Omit<ReelPlan, "shots"> & { shots: (ReelShot & { asset: string })[]; at?: number }) | undefined;
  const ordered = useMemo(() => assets.filter((a) => a.kind === "photo" && a.url).sort((a, b) => a.order - b.order), [assets]);
  const key = ordered.map((a) => a._id).join(",");

  // Photos are only needed once there is a plan to play.
  useEffect(() => {
    let alive = true;
    setPhotos(null);
    if (!ordered.length || !stored?.shots) return;
    const batch = ordered.slice(0, 14);
    void Promise.allSettled(batch.map((a) => loadPhoto(media(a.url as string)))).then((r) => {
      if (!alive) return;
      setPhotos(r.flatMap((x) => (x.status === "fulfilled" ? [x.value] : [])));
      setLoadedIds(r.flatMap((x, i) => (x.status === "fulfilled" ? [batch[i]._id as string] : [])));
    });
    return () => { alive = false; };
  }, [key, stored?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  // The director stores photo ids. Turn them back into positions in the photos we have loaded.
  const plan: ReelPlan | null = stored?.shots
    ? { kicker: stored.kicker, closing: stored.closing, shots: stored.shots.map((x) => ({ ...x, photo: loadedIds.indexOf(x.asset) })).filter((x) => x.photo >= 0) }
    : null;
  const ready = !!plan && plan.shots.length >= 3 && !!photos?.length;
  const palette = PALETTES.find((p) => p.id === project.palette) ?? PALETTES[0];
  const look = (project.siteDesign as { colors?: { accent: string; bg: string; ink: string } } | undefined)?.colors;
  const styles: Record<ReelFormat, ReelStyle> = { portrait: asStyle(project.videoStyles[0]), landscape: asStyle(project.videoStyles[1] ?? project.videoStyles[0]) };
  const scene = (format: ReelFormat): ReelScene | null =>
    ready
      ? { plan, names: project.names, occasion: OCCASION[project.occasion] ?? "Celebration", dateLabel: project.eventDate ? prettyDate(project.eventDate) : undefined, line: project.headline ?? undefined, photos: photos!, accent: look?.accent ?? palette.accent, paper: look?.bg ?? palette.bg, ink: look?.ink ?? palette.ink, style: styles[format] }
      : null;
  const preview = useMemo(() => scene(shape), [ready, shape, loadedIds.join(), stored?.at, project.names, project.eventDate, project.palette, project.videoStyles.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const used = project.directedCount ?? 0;
  const left = Math.max(0, RUNS - used);
  const made = (f: ReelFormat) => deliverables.some((d) => d.label.startsWith("Instant video") && d.format === f);
  const support = typeof window !== "undefined" ? recordingSupport() : null;

  async function runDirector() {
    setError(null);
    setDirecting(true);
    try {
      await direct({ projectId: project._id });
      track("video_directed_seen", { slug: project.slug });
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setDirecting(false);
    }
  }

  async function makeBoth() {
    setError(null);
    try {
      let audio: ArrayBuffer | null = null;
      if (songUrl) {
        setStage("Getting your song");
        audio = await fetch(media(songUrl)).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
      }
      for (const format of ["portrait", "landscape"] as const) {
        const s = scene(format);
        if (!s) throw new Error("Direct your videos first.");
        setStage(format === "portrait" ? "Making your tall video (1 of 2)" : "Making your wide video (2 of 2)");
        setProgress(0);
        const out = await recordReel(s, format, { audio, onProgress: setProgress });
        setStage(format === "portrait" ? "Saving your tall video" : "Saving your wide video");
        setProgress(0);
        const storageId = await uploadToStorage(await genUrl({}), out.blob, out.mime, setProgress);
        await save({ id: project._id, storageId: storageId as Id<"_storage">, format });
      }
      track("videos_made", { slug: project.slug });
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setStage(null);
    }
  }

  if (ordered.length < 3) return null;

  if (!paid) {
    return (
      <div className="director">
        <div className="grow">
          <b>Your designed website and two videos come after payment</b>
          <span>An AI designer and director studies every photo and your words. It designs the website around them, then cuts a tall and a wide video to your song. It takes a few minutes.</span>
        </div>
      </div>
    );
  }
  if (aiOn === false) return <div className="card"><b>Your videos</b><p className="muted" style={{ marginBottom: 0 }}>Video direction is being set up. Check back shortly.</p></div>;

  return (
    <div className="card stack" style={{ gap: 14 }}>
      <div className="row between">
        <h3 style={{ fontSize: 24 }}>Your website design and videos</h3>
        {ready ? (
          <div className="pills light-ground">
            <button className={shape === "portrait" ? "on" : ""} onClick={() => setShape("portrait")}>Tall</button>
            <button className={shape === "landscape" ? "on" : ""} onClick={() => setShape("landscape")}>Wide</button>
          </div>
        ) : null}
      </div>

      {!stored?.shots ? (
        <div className="director">
          <div className="grow">
            <b>{directing ? "The director is studying your photos…" : "Ready when you are"}</b>
            <span>{directing ? "About a minute. It picks your colors and layout, finds every face and plans each camera move." : "Finish your photos, words and song first. It designs your website and directs both videos from them. You get one free redo, and you can edit the website by hand for free any time."}</span>
          </div>
          <button className="btn small" disabled={directing} onClick={() => void runDirector()}>{directing ? "Working…" : "Design my website and videos"}</button>
        </div>
      ) : (
        <>
          <div className={`demo-stage ${shape}`}>{preview ? <ReelPlayer scene={preview} format={shape} label="Your video" /> : <p className="muted">Loading your photos…</p>}</div>
          {!support ? (
            <p className="err">This browser cannot save videos. Open this page in Chrome or Safari.</p>
          ) : stage ? (
            <div className="stack" style={{ gap: 8 }}>
              <b>{stage}</b>
              <div className="bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              <p className="muted small" style={{ margin: 0 }}>Keep this page open and on screen. Each video takes about as long as it plays.</p>
            </div>
          ) : (
            <div className="row">
              <button className="btn hot" disabled={!ready} onClick={() => void makeBoth()}>{made("portrait") && made("landscape") ? "Save them again" : "Save my two videos"}</button>
              {left > 0 ? <button className="btn ghost" disabled={directing} onClick={() => void runDirector()}>{directing ? "Directing…" : "Try a different design and cut (1 free redo)"}</button> : <span className="muted small">Your free redo is used.</span>}
            </div>
          )}
          {made("portrait") && made("landscape") && !stage ? <p className="okmsg" style={{ margin: 0 }}>Both videos are saved. Download them below.</p> : null}
        </>
      )}
      {project.siteDesign ? <p className="muted small" style={{ margin: 0 }}>Your website has its new design. <a href={`/app/preview/${project.slug}`} target="_blank" rel="noreferrer"><b>Open it</b></a>, or change it by hand in the Look step.</p> : null}
      {error ? <div className="err">{error}</div> : null}
    </div>
  );
}
