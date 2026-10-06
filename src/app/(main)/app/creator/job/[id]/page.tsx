"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { cleanError, naira, prettyDate } from "@/lib/format";
import { uploadToStorage } from "@/lib/upload";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const jobId = id as Id<"jobs">;
  const b = useQuery(api.creators.brief, { jobId });
  const genUrl = useMutation(api.creators.generateUploadUrl);
  const submit = useMutation(api.creators.submit);
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function upload(file: File) {
    setError(null);
    try {
      setProgress(0);
      const url = await genUrl({});
      const storageId = await uploadToStorage(url, file, file.type || "video/mp4", setProgress);
      await submit({ jobId, storageId: storageId as Id<"_storage"> });
      setDone(true);
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setProgress(null);
    }
  }

  return (
    <>
      <Header />
      <main className="wrap" style={{ padding: "28px 16px 64px" }}>
        <Link href="/app/creator" className="muted small">← Studio</Link>
        {b === undefined ? <p className="muted">Loading…</p> : b === null ? <p className="err">This job is not available to you.</p> : (
          <div className="grid two" style={{ marginTop: 12 }}>
            <div className="stack">
              <h1 className="display" style={{ fontSize: 38 }}>{b.names}</h1>
              <div className="row"><span className="chip gold" style={{ textTransform: "capitalize" }}>{b.job.style}</span><span className="chip" style={{ textTransform: "capitalize" }}>{b.job.slot === "portrait" ? "Portrait 9:16" : "Landscape 16:9"}</span><span className="chip ok">{naira(b.job.payoutKobo)}</span></div>
              <div className="muted small">{b.occasion}{b.eventDate ? ` · ${prettyDate(b.eventDate)}` : ""}</div>
              {b.job.reviewNote ? <div className="card err">Changes asked for: {b.job.reviewNote}</div> : null}
              {b.headline ? <div><b>Headline</b><p style={{ margin: "4px 0 0" }}>{b.headline}</p></div> : null}
              {b.story ? <div><b>Story</b><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{b.story}</p></div> : null}
              {b.message ? <div><b>Note to show</b><p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{b.message}</p></div> : null}
              <div><b>Song</b><p style={{ margin: "4px 0 0" }}>{b.songName ?? "Pick one that suits the style."} {b.songUrl ? <a href={b.songUrl} target="_blank" rel="noreferrer" download>Download</a> : null}</p></div>
              <div className="card stack" style={{ gap: 10 }}>
                <b>Upload your finished video</b>
                <p className="muted small" style={{ margin: 0 }}>One mp4 or mov, up to 200 MB. Keep the customer's photos private and delete them when you finish.</p>
                <div><button className="btn" disabled={progress !== null || done} onClick={() => input.current?.click()}>{done ? "Sent for review" : "Choose video"}</button></div>
                <input ref={input} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
                {progress !== null ? <div className="bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div> : null}
                {error ? <div className="err">{error}</div> : null}
                {done ? <div className="okmsg">Thank you. We review it and your balance updates when it is approved.</div> : null}
              </div>
            </div>
            <div className="stack">
              <b>Photos in order ({b.photos.length})</b>
              <div className="thumbs">{b.photos.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer" className="thumb" download><img src={u} alt={`Photo ${i + 1}`} loading="lazy" /></a>)}</div>
              {b.videos.length ? <><b>Customer videos</b>{b.videos.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer">Video {i + 1}</a>)}</> : null}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
