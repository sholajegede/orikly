"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_SONG_BYTES, SONG_LIBRARY } from "@convex/lib/constants";
import { uploadToStorage } from "@/lib/upload";
import { cleanError, mb } from "@/lib/format";
import type { BuilderData, ProjectPatch } from "./shared";

export function Song({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project, songUrl } = data;
  const genUrl = useMutation(api.assets.generateUploadUrl);
  const setSong = useMutation(api.assets.setSong);
  const clearSong = useMutation(api.assets.clearSong);
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("audio/")) return setError("Pick an audio file (mp3 or m4a).");
    if (file.size > MAX_SONG_BYTES) return setError(`That file is ${mb(file.size)}. The limit is ${mb(MAX_SONG_BYTES)}.`);
    try {
      setProgress(0);
      const url = await genUrl({});
      const storageId = await uploadToStorage(url, file, file.type, setProgress);
      await setSong({ projectId: project._id, storageId: storageId as Id<"_storage">, name: file.name.replace(/\.[^.]+$/, "") });
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>Pick the song for your two videos.</p>

      {SONG_LIBRARY.length === 0 ? (
        <div className="card muted small">Our song library is coming soon. For now, upload the song you want.</div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {SONG_LIBRARY.map((s) => (
            <button key={s.id} className={`opt ${project.songChoice === s.id ? "on" : ""}`} onClick={() => void save({ songChoice: s.id })}>
              <b>{s.title}</b> <span className="muted small">{s.artist}</span>
            </button>
          ))}
        </div>
      )}

      <div className="card stack" style={{ gap: 10 }}>
        <b style={{ display: "block", marginBottom: 4 }}>Use your own song</b>
        <span className="muted small">Your song goes into your two downloadable videos only. It does not play on your public website. You confirm you have the right to use it.</span>
        {project.songName ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between"><span><b>{project.songName}</b></span><button className="btn ghost small" onClick={() => void clearSong({ projectId: project._id })}>Remove</button></div>
            {songUrl ? <audio src={songUrl} controls preload="none" style={{ width: "100%" }} /> : null}
          </div>
        ) : null}
        <div><button className="btn ghost" onClick={() => input.current?.click()} disabled={progress !== null}>{project.songName ? "Replace song" : "Upload a song"}</button></div>
        <input ref={input} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        {progress !== null ? <div className="bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div> : null}
        {error ? <div className="err">{error}</div> : null}
      </div>
    </div>
  );
}
