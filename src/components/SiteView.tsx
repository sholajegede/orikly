"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { OCCASIONS, PALETTES } from "@convex/lib/constants";
import { cleanError, daysUntil, prettyDate } from "@/lib/format";
import { useTrack } from "@/lib/track";

const main = process.env.NEXT_PUBLIC_SITE_URL ?? "/";

export type SiteData = NonNullable<FunctionReturnType<typeof api.projects.publicBySlug>>;

/**
 * Live sites arrive pre-rendered from the server and are cached, so thousands of guests cost one query.
 * Without that (a draft preview for the owner), the page subscribes to the live query instead.
 */
export function SiteView({ slug, initial }: { slug: string; initial?: SiteData }) {
  const fresh = useQuery(api.projects.publicBySlug, initial ? "skip" : { slug });
  const data = initial ?? fresh;
  const addWish = useMutation(api.wishes.add);
  const track = useTrack();
  const viewed = useRef(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [guest, setGuest] = useState("");
  const [msg, setMsg] = useState("");
  const [trap, setTrap] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && data.live && !data.isOwner && !viewed.current) {
      viewed.current = true;
      track("site_view", { slug });
    }
  }, [data, slug, track]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (data === undefined) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }} className="muted">Loading…</div>;
  }
  if (data === null) {
    return (
      <main className="wrap narrow" style={{ padding: "80px 16px", textAlign: "center" }}>
        <h1 className="display" style={{ fontSize: 56 }}>Not live yet</h1>
        <p className="muted">This website is not live yet, or the link is wrong.</p>
        <a className="btn" href={main}>Go to Orikly</a>
      </main>
    );
  }

  const { site, photos, videos, wishes, coverUrl, featuredVideoUrl, isOwner, live } = data;
  const palette = PALETTES.find((p) => p.id === site.palette) ?? PALETTES[0];
  const occ = OCCASIONS.find((o) => o.id === site.occasion)!;
  const midnight = site.siteStyle === "midnight";
  const days = site.eventDate ? daysUntil(site.eventDate) : null;
  const vars: Record<string, string> = { "--accent": palette.accent, "--on-accent": palette.onAccent };
  if (!midnight) {
    vars["--bg"] = palette.bg;
    vars["--card"] = palette.card;
    vars["--ink"] = palette.ink;
    vars["--muted"] = palette.muted;
    vars["--line"] = palette.accent2;
  }
  const allVideos = [...(featuredVideoUrl ? [featuredVideoUrl] : []), ...videos.map((v) => v.url)];
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  async function sendWish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await addWish({ slug, guestName: guest, message: msg, website: trap || undefined });
      setSent(true);
      setGuest("");
      setMsg("");
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site" data-style={site.siteStyle} style={vars as React.CSSProperties}>
      {isOwner && !live ? <div className="banner">Preview. Only you can see this website until your payment is confirmed.</div> : null}

      <header className="hero-s">
        {coverUrl ? <img className="bg" src={coverUrl} alt="" /> : null}
        <div className="inner">
          <div className="eyebrow">{occ.label}{site.eventDate ? ` · ${prettyDate(site.eventDate)}` : ""}</div>
          <h1 className="names">{site.names}</h1>
          {site.headline ? <p className="headline">{site.headline}</p> : null}
          {days !== null && days > 0 ? <span className="count">{days} {days === 1 ? "day" : "days"} to go</span> : null}
          {days === 0 ? <span className="count">Today</span> : null}
        </div>
      </header>

      {site.story ? (
        <section className="sec"><div className="wrap"><h2>Our story</h2><p className="prose">{site.story}</p></div></section>
      ) : null}

      {allVideos.length ? (
        <section className="sec"><div className="wrap"><h2>Watch</h2>
          <div className="vids">
            {allVideos.map((u, i) => (
              <video key={u} src={u} controls playsInline preload="none" onPlay={() => track("video_play", { slug, props: { n: i } })} />
            ))}
          </div>
        </div></section>
      ) : null}

      {photos.length ? (
        <section className="sec"><div className="wrap"><h2>Moments</h2>
          <div className="gallery">
            {photos.map((p) => (
              <img key={p.url} src={p.url} alt="" loading="lazy" onClick={() => { setLightbox(p.url); track("photo_open", { slug }); }} />
            ))}
          </div>
        </div></section>
      ) : null}

      {site.message ? (
        <section className="sec"><div className="wrap"><h2>A note</h2><div className="note">{site.message}</div></div></section>
      ) : null}

      {site.wishesOn ? (
        <section className="sec"><div className="wrap" style={{ maxWidth: 720 }}>
          <h2>Wishes</h2>
          {live ? (
            <form className="stack" onSubmit={sendWish} style={{ marginBottom: 24 }}>
              <label className="field"><span>Your name</span><input type="text" required maxLength={60} value={guest} onChange={(e) => setGuest(e.target.value)} /></label>
              <label className="field"><span>Your wish</span><textarea required maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} name="website" />
              {error ? <div className="err">{error}</div> : null}
              {sent ? <div className="okmsg">Thank you. Your wish will show once it has been approved.</div> : null}
              <div><button className="btn sbtn" disabled={busy}>{busy ? "Sending…" : "Send my wish"}</button></div>
            </form>
          ) : (
            <p className="muted">Guests can leave wishes here once your website is live.</p>
          )}
          <div className="stack">
            {wishes.map((w, i) => (
              <div className="wish" key={`${w.createdAt}-${i}`}><b>{w.guestName}</b><p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{w.message}</p></div>
            ))}
          </div>
        </div></section>
      ) : null}

      {live ? (
        <section className="sec"><div className="wrap row" style={{ justifyContent: "center" }}>
          <a className="btn sbtn" href={`https://wa.me/?text=${encodeURIComponent(`${site.names}: ${pageUrl}`)}`} target="_blank" rel="noreferrer" onClick={() => track("share_click", { slug, props: { channel: "whatsapp" } })}>Share on WhatsApp</a>
        </div></section>
      ) : null}

      <footer className="made">
        Made with <a href={`${main}?ref=site-${slug}`} onClick={() => track("footer_click", { slug })}>Orikly</a>. Make yours.
      </footer>

      {lightbox ? <div className="lightbox" onClick={() => setLightbox(null)}><img src={lightbox} alt="" /></div> : null}
    </div>
  );
}
