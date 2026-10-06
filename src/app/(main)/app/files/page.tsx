"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { mb, shortDate } from "@/lib/format";

const KIND: Record<string, string> = { photo: "Photo", video: "Clip", song: "Song", finished: "Finished video" };

function Words({ label, text }: { label: string; text: string | null }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <div className="word-row">
      <div><span className="tagline muted">{label}</span><p>{text}</p></div>
      <button className="btn ghost small" onClick={() => { void navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : "Copy"}</button>
    </div>
  );
}

/** The data room: everything the customer has given us and everything we made for them. */
export default function Files() {
  const data = useQuery(api.account.files);
  const [only, setOnly] = useState<string>("all");
  const groups = (data?.groups ?? []).filter((g) => only === "all" || g._id === only);

  return (
    <>
      <AppBar />
      <main className="wrap dash">
        <div className="dash-top">
          <div>
            <h1>Files</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>Everything you have uploaded and everything we made for you. Yours to download any time.</p>
          </div>
          {data ? <div className="chip">{data.count} file{data.count === 1 ? "" : "s"}, {mb(data.bytes)}</div> : null}
        </div>

        {data === undefined ? <p className="muted">Loading…</p> : !data || data.groups.length === 0 ? (
          <div className="dash-empty">
            <b>Nothing here yet</b>
            <p className="muted">Your photos, videos, song and words show here once you start a celebration.</p>
            <Link href="/app/new" className="btn hot">Start a celebration</Link>
          </div>
        ) : (
          <>
            {data.groups.length > 1 ? (
              <div className="pills light-ground" style={{ marginBottom: 20 }}>
                <button className={only === "all" ? "on" : ""} onClick={() => setOnly("all")}>All</button>
                {data.groups.map((g) => <button key={g._id} className={only === g._id ? "on" : ""} onClick={() => setOnly(g._id)}>{g.names}</button>)}
              </div>
            ) : null}
            {groups.map((g) => (
              <section key={g._id} className="dash-block" style={{ marginTop: 0, marginBottom: 32 }}>
                <div className="dash-head">
                  <h2>{g.names}</h2>
                  <Link href={`/app/${g._id}`} className="btn ghost small">Add or change</Link>
                </div>
                {g.files.length === 0 ? <p className="muted">No files yet.</p> : (
                  <div className="file-grid">
                    {g.files.map((f) => (
                      <a key={f.id} className="file" href={f.url ?? "#"} target="_blank" rel="noreferrer" download>
                        <span className={`pic k-${f.kind}`}>{f.kind === "photo" && f.url ? <img src={f.url} alt="" loading="lazy" /> : <i>{KIND[f.kind] ?? "File"}</i>}</span>
                        <b>{f.name}</b>
                        <small>{mb(f.size)}, {shortDate(f.at)}</small>
                      </a>
                    ))}
                  </div>
                )}
                {g.words.headline || g.words.story || g.words.message ? (
                  <div className="card" style={{ marginTop: 16 }}>
                    <Words label="Headline" text={g.words.headline} />
                    <Words label="Your story" text={g.words.story} />
                    <Words label="Note to guests" text={g.words.message} />
                  </div>
                ) : null}
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}
