"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { OCCASIONS, PALETTES } from "@convex/lib/constants";
import { fontsHref } from "@convex/lib/design";
import { SiteCanvas, type CanvasData } from "@/components/site/SiteCanvas";
import { cleanError, daysUntil, prettyDate } from "@/lib/format";
import { useTrack } from "@/lib/track";

const main = process.env.NEXT_PUBLIC_SITE_URL ?? "/";

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

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
  const preview = usePathname().startsWith("/app/preview");
  const root = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [guest, setGuest] = useState("");
  const [msg, setMsg] = useState("");
  const [trap, setTrap] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Sections rise into place as they scroll in. Without scripts, everything simply shows.
  const stamp = data?.design ? `${data.design.at}:${data.photos.length}` : "";
  useEffect(() => {
    const el = root.current;
    if (!el || !stamp || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const page = el.querySelector(".cz");
    if (!page) return;
    page.classList.add("anim");
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [stamp]);

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

  const { site, photos, videos, wishes, coverUrl, featuredVideoUrl, isOwner, live, design } = data;
  const palette = PALETTES.find((p) => p.id === site.palette) ?? PALETTES[0];
  const occ = OCCASIONS.find((o) => o.id === site.occasion)!;
  const midnight = site.siteStyle === "midnight";
  const days = site.eventDate ? daysUntil(site.eventDate) : null;
  const allVideos = [...(featuredVideoUrl ? [featuredVideoUrl] : []), ...videos.map((v) => v.url)];
  const open = (url: string) => { setLightbox(url); track("photo_open", { slug }); };

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

  const banner = isOwner && !live ? <div className="banner">Preview. Only you can see this website until your payment is confirmed.</div> : null;
  const facts = (
    <div className="facts">
      {site.eventDate ? <div><span>Date</span><b>{prettyDate(site.eventDate)}</b></div> : null}
      {site.eventTime ? <div><span>Time</span><b>{clock(site.eventTime)}</b></div> : null}
      {site.venue ? <div><span>Venue</span><b>{site.venue}</b>{site.mapUrl ? <a href={site.mapUrl} target="_blank" rel="noreferrer" onClick={() => track("map_open", { slug })}>Open in Maps</a> : null}</div> : null}
      {site.dressCode ? <div><span>Colors of the day</span><b>{site.dressCode}</b></div> : null}
    </div>
  );
  const vids = (
    <div className="vids">
      {allVideos.map((u, i) => (
        <video key={u} src={u} controls playsInline preload="none" onPlay={() => track("video_play", { slug, props: { n: i } })} />
      ))}
    </div>
  );
  const wishBlock = (
    <>
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
    </>
  );
  const giftBlock = site.gift ? (
    <div className="giftcard">
      <span>{site.gift.bank}</span>
      <b>{site.gift.number}</b>
      <span>{site.gift.name}</span>
      <button className="btn sbtn" onClick={() => { void navigator.clipboard?.writeText(site.gift!.number); setCopied(true); setTimeout(() => setCopied(false), 1600); track("gift_copy", { slug }); }}>{copied ? "Copied" : "Copy account number"}</button>
    </div>
  ) : null;
  const shareBlock = live ? (
    <button className="btn sbtn" onClick={() => { track("share_click", { slug, props: { channel: "whatsapp" } }); window.open(`https://wa.me/?text=${encodeURIComponent(`${site.names}: ${window.location.href}`)}`, "_blank", "noopener"); }}>Share on WhatsApp</button>
  ) : null;
  const made = (
    <footer className="made">
      Made with <a href={`${main}?ref=site-${slug}`} onClick={() => track("footer_click", { slug })}>Orikly</a>. Make yours.
    </footer>
  );
  const box = lightbox ? <div className="lightbox" onClick={() => setLightbox(null)}><img src={lightbox} alt="" /></div> : null;
  const countLabel = days !== null && days > 0 ? `${days} ${days === 1 ? "day" : "days"} to go` : days === 0 ? "Today is the day" : null;

  if (design) {
    const canvas: CanvasData = { design, live, site, photos, clips: videos, films: data.films, wishes };
    return (
      <div ref={root}>
        <link rel="stylesheet" href={fontsHref(design)} precedence="default" />
        <SiteCanvas
          data={canvas}
          banner={banner}
          letters={data.letters.length && (data.lettersOn || isOwner) ? { href: preview ? `/app/preview/${slug}/open-when` : `/s/${slug}/open-when`, count: data.letters.length } : undefined}
          onTrack={(name, props) => track(name, { slug, props })}
          onWish={async (name, message, website) => { try { await addWish({ slug, guestName: name, message, website: website || undefined }); } catch (e) { throw new Error(cleanError(e)); } }}
          onShare={() => { track("share_click", { slug, props: { channel: "whatsapp" } }); window.open(`https://wa.me/?text=${encodeURIComponent(`${site.names}: ${window.location.href}`)}`, "_blank", "noopener"); }}
        />
      </div>
    );
  }

  const vars: Record<string, string> = { "--accent": palette.accent, "--on-accent": palette.onAccent };
  if (!midnight) {
    vars["--bg"] = palette.bg;
    vars["--card"] = palette.card;
    vars["--ink"] = palette.ink;
    vars["--muted"] = palette.muted;
    vars["--line"] = palette.accent2;
  }

  return (
    <div className="site" data-style={site.siteStyle} style={vars as React.CSSProperties}>
      {banner}
      <header className="hero-s">
        {coverUrl ? <img className="bg" src={coverUrl} alt="" /> : null}
        <div className="inner">
          <div className="eyebrow">{occ.label}{site.eventDate ? ` · ${prettyDate(site.eventDate)}` : ""}</div>
          <h1 className="names">{site.names}</h1>
          {site.headline ? <p className="headline">{site.headline}</p> : null}
          {countLabel ? <span className="count">{countLabel}</span> : null}
        </div>
      </header>
      {site.venue || site.eventTime || site.dressCode ? <section className="sec"><div className="wrap"><h2>The day</h2>{facts}</div></section> : null}
      {site.story ? <section className="sec"><div className="wrap"><h2>Our story</h2><p className="prose">{site.story}</p></div></section> : null}
      {allVideos.length ? <section className="sec"><div className="wrap"><h2>Watch</h2>{vids}</div></section> : null}
      {photos.length ? (
        <section className="sec"><div className="wrap"><h2>Moments</h2>
          <div className="gallery">{photos.map((p) => (<img key={p.url} src={p.url} alt="" loading="lazy" onClick={() => open(p.url)} />))}</div>
        </div></section>
      ) : null}
      {site.message ? <section className="sec"><div className="wrap"><h2>A note</h2><div className="note">{site.message}</div></div></section> : null}
      {site.wishesOn ? <section className="sec"><div className="wrap" style={{ maxWidth: 720 }}><h2>Wishes</h2>{wishBlock}</div></section> : null}
      {giftBlock ? <section className="sec"><div className="wrap" style={{ maxWidth: 720 }}><h2>Send a gift</h2>{giftBlock}</div></section> : null}
      {shareBlock ? <section className="sec"><div className="wrap row" style={{ justifyContent: "center" }}>{shareBlock}</div></section> : null}
      {made}
      {box}
    </div>
  );
}
