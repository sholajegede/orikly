"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { OCCASIONS, PALETTES } from "@convex/lib/constants";
import { fontsHref, onColor, type DesignSection, type SiteDesign } from "@convex/lib/design";
import { cleanError, daysUntil, prettyDate } from "@/lib/format";
import { textileSize, textileUrl } from "@/lib/textile";
import { useTrack } from "@/lib/track";

const main = process.env.NEXT_PUBLIC_SITE_URL ?? "/";

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export type SiteData = NonNullable<FunctionReturnType<typeof api.projects.publicBySlug>>;

const WEIGHT: Record<string, number> = { "Bricolage Grotesque": 700, Syne: 700, Fraunces: 500, "Playfair Display": 500, "Cormorant Garamond": 600 };
const TITLES: Record<DesignSection["type"], string> = { story: "Our story", quote: "", numbers: "In numbers", gallery: "Moments", details: "The day", videos: "Watch", moment: "Celebrate", note: "A note", gift: "Send a gift", wishes: "Wishes" };

/** One tap for the guest: blow out the candles on a birthday, throw confetti on any other day. */
function Moment({ birthday, names, onDone }: { birthday: boolean; names: string; onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [bits, setBits] = useState<{ x: number; d: number; r: number; c: number; s: number }[]>([]);
  const go = () => {
    setBits(Array.from({ length: 70 }, () => ({ x: Math.random() * 100, d: Math.random() * 0.7, r: Math.random() * 720 - 360, c: Math.floor(Math.random() * 3), s: 7 + Math.random() * 9 })));
    if (!done) onDone();
    setDone(true);
  };
  return (
    <div className={`dz-moment ${done ? "done" : ""}`}>
      {birthday ? <div className="dz-candles" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ transitionDelay: `${i * 0.12}s` }} />)}</div> : null}
      <p aria-live="polite">{done ? (birthday ? "Wish made. It is on its way." : `To ${names}!`) : birthday ? "Close your eyes, make a wish for the celebrant, then blow." : "This is the part where everybody shouts."}</p>
      <button className="btn sbtn" onClick={go}>{done ? "Again" : birthday ? "Blow out the candles" : "Throw confetti"}</button>
      {bits.length ? <div className="dz-confetti" key={bits[0].x} aria-hidden="true">{bits.map((b, i) => <i key={i} data-c={b.c} style={{ left: `${b.x}%`, width: b.s, height: b.s * 0.45, animationDelay: `${b.d}s`, ["--r" as string]: `${b.r}deg` }} />)}</div> : null}
    </div>
  );
}

function Polaroid({ url, line, tilt, onOpen }: { url: string; line?: string; tilt: number; onOpen: () => void }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button className={`dz-pol rv ${flipped ? "flip" : ""}`} style={{ ["--t" as string]: `${tilt}deg` }} onClick={() => (line ? setFlipped(!flipped) : onOpen())} aria-label={line ? "Turn this photo over" : "Open photo"}>
      <span className="face"><img src={url} alt="" loading="lazy" />{line ? <em>tap</em> : null}</span>
      {line ? <span className="back"><span>{line}</span></span> : null}
    </button>
  );
}

/** Ticks down to the day. It renders only in the browser, so the cached page stays the same for everyone. */
function Countdown({ date, time }: { date: string; time: string | null }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const target = new Date(`${date}T${time ?? "00:00"}:00`).getTime();
    const tick = () => setLeft(target - Date.now());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [date, time]);
  if (left === null || left <= 0) return null;
  const mins = Math.floor(left / 60_000);
  const parts: [number, string][] = [[Math.floor(mins / 1440), "days"], [Math.floor((mins % 1440) / 60), "hours"], [mins % 60, "minutes"]];
  return (
    <div className="dz-count" aria-label="Time left until the day">
      {parts.map(([n, l]) => (<div key={l}><b>{n}</b><span>{l}</span></div>))}
    </div>
  );
}

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
    el.classList.add("anim");
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

  if (design) return designed(design);

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

  function designed(d: SiteDesign) {
    const byId = new Map(photos.map((p) => [p.id, p.url]));
    const heroUrl = (d.hero.photo && byId.get(d.hero.photo)) || coverUrl;
    const extra = (d.hero.extra ?? []).map((id) => byId.get(id)).filter((u): u is string => !!u);
    const variant = !heroUrl ? "stack" : d.hero.variant === "collage" && extra.length < 2 ? "full" : d.hero.variant;
    const focus = { objectPosition: `${Math.round(d.hero.fx * 100)}% ${Math.round(d.hero.fy * 100)}%` };
    const vars = {
      "--bg": d.colors.bg, "--ink": d.colors.ink, "--accent": d.colors.accent, "--card": d.colors.card, "--muted": d.colors.muted,
      "--on-accent": onColor(d.colors.accent), "--df": `"${d.fonts.display}", Georgia, serif`, "--bf": `"${d.fonts.body}", system-ui, sans-serif`, "--dw": String(WEIGHT[d.fonts.display] ?? 400),
    } as React.CSSProperties;
    const band = d.motif !== "none" ? <div className="dz-band" aria-hidden="true" style={{ backgroundImage: textileUrl(d.motif, d.colors.accent, d.colors.bg), backgroundSize: textileSize(d.motif) }} /> : null;

    const has: Record<DesignSection["type"], (s: DesignSection) => boolean> = {
      story: () => !!site.story,
      quote: (s) => !!s.text,
      numbers: (s) => (s.items ?? []).length >= 2,
      moment: () => true,
      gallery: (s) => (s.photos ?? []).some((id) => byId.has(id)),
      details: () => !!(site.eventDate || site.venue || site.eventTime || site.dressCode),
      videos: () => allVideos.length > 0,
      note: () => !!site.message,
      gift: () => !!giftBlock,
      wishes: () => site.wishesOn,
    };
    const shown = d.sections.filter((s) => !s.hidden && has[s.type](s));
    // The full countdown lives in "The day". The hero only shows the short one when that part is hidden.
    const ticking = days !== null && days > 0 && shown.some((s) => s.type === "details");
    let n = 0;
    const head = (s: DesignSection) => {
      n += 1;
      return <header className="dz-h rv"><span>{String(n).padStart(2, "0")}</span><h2>{s.title ?? TITLES[s.type]}</h2></header>;
    };

    const body = (s: DesignSection, i: number) => {
      switch (s.type) {
        case "quote":
          return <section key={i} className="dz-sec dz-quote rv"><blockquote>{s.text}</blockquote></section>;
        case "story": {
          const side = s.layout === "side" && s.photo ? byId.get(s.photo) : undefined;
          return (
            <section key={i} className="dz-sec"><div className={`dz-wrap ${side ? "dz-side" : "dz-narrow"}`}>
              <div>{head(s)}<p className={`dz-prose rv ${s.layout === "dropcap" ? "cap" : ""}`}>{site.story}</p></div>
              {side ? <img className="rv" src={side} alt="" loading="lazy" onClick={() => open(side)} /> : null}
            </div></section>
          );
        }
        case "gallery": {
          const urls = (s.photos ?? []).map((id) => byId.get(id)).filter((u): u is string => !!u);
          if (s.layout === "wall") {
            const ids = (s.photos ?? []).filter((id) => byId.has(id));
            return (
              <section key={i} className="dz-sec"><div className="dz-wrap">{head(s)}
                {(s.lines ?? []).some(Boolean) ? <p className="dz-hint rv">Tap a photo to turn it over.</p> : null}
                <div className="dz-wall">{ids.map((id, k) => (<Polaroid key={id} url={byId.get(id)!} line={(s.lines ?? [])[(s.photos ?? []).indexOf(id)] || undefined} tilt={[-3, 2, -1.5, 3, -2.5, 1.5][k % 6]} onOpen={() => open(byId.get(id)!)} />))}</div>
              </div></section>
            );
          }
          return (
            <section key={i} className="dz-sec"><div className="dz-wrap">{head(s)}
              <div className={`dz-gal ${s.layout ?? "masonry"}`}>{urls.map((u) => (<img key={u} className="rv" src={u} alt="" loading="lazy" onClick={() => open(u)} />))}</div>
            </div></section>
          );
        }
        case "numbers":
          return (
            <section key={i} className="dz-sec dz-nums"><div className="dz-wrap">
              <div className="dz-numgrid">{(s.items ?? []).map((x, k) => (<div key={k} className="rv"><b>{x.value}</b><span>{x.label}</span></div>))}</div>
            </div></section>
          );
        case "moment":
          return <section key={i} className="dz-sec dz-momentsec"><div className="dz-wrap dz-narrow">{head(s)}<div className="rv"><Moment birthday={site.occasion === "birthday"} names={site.names} onDone={() => track("moment_tap", { slug })} /></div></div></section>;
        case "details":
          return (
            <section key={i} className="dz-sec dz-day"><div className="dz-wrap">{head(s)}
              {site.eventDate && days !== null && days > 0 ? <div className="rv"><div className="dz-countlabel">Counting down to the day</div><Countdown date={site.eventDate} time={site.eventTime} /></div> : null}
              <div className="rv">{facts}</div>
            </div></section>
          );
        case "videos":
          return <section key={i} className="dz-sec"><div className="dz-wrap">{head(s)}<div className="rv">{vids}</div></div></section>;
        case "note":
          return <section key={i} className="dz-sec"><div className="dz-wrap dz-narrow">{head(s)}<div className="dz-note rv"><p>{site.message}</p><b>{site.names}</b></div></div></section>;
        case "gift":
          return <section key={i} className="dz-sec"><div className="dz-wrap dz-narrow">{head(s)}<div className="rv">{giftBlock}</div></div></section>;
        case "wishes":
          return <section key={i} className="dz-sec"><div className="dz-wrap dz-narrow">{head(s)}<div className="rv">{wishBlock}</div></div></section>;
      }
    };

    const meta = [occ.label, site.eventDate ? prettyDate(site.eventDate) : null, site.venue].filter(Boolean).join(" · ");
    const words = (
      <div className="dz-words">
        {d.hero.kicker ? <div className="dz-kick">{d.hero.kicker}</div> : null}
        <h1 className={`dz-names ${d.namesStyle}`}>{site.names}</h1>
        {d.hero.tagline || site.headline ? <p className="dz-tag">{d.hero.tagline ?? site.headline}</p> : null}
        <div className="dz-meta">{meta}</div>
        {countLabel && !ticking ? <span className="dz-chip">{countLabel}</span> : null}
      </div>
    );

    return (
      <div className="site dz" ref={root} style={vars}>
        <link rel="stylesheet" href={fontsHref(d)} precedence="default" />
        {banner}
        <header className={`dz-hero ${variant}`}>
          {variant === "full" ? <><img className="dz-cover" src={heroUrl!} alt="" style={focus} />{words}</> : null}
          {variant === "split" ? <>{words}<div className="dz-arch"><img src={heroUrl!} alt="" style={focus} /></div></> : null}
          {variant === "stack" ? <>{words}{heroUrl ? <div className="dz-frame"><img src={heroUrl} alt="" style={focus} /></div> : null}</> : null}
          {variant === "collage" ? <>{words}<div className="dz-collage"><img src={extra[0]} alt="" /><img src={heroUrl!} alt="" style={focus} /><img src={extra[1]} alt="" /></div></> : null}
        </header>
        {band}
        {shown.map(body)}
        {shareBlock ? <section className="dz-sec dz-share"><p>Send this to someone who should be there.</p>{shareBlock}</section> : null}
        {band}
        {made}
        {box}
      </div>
    );
  }
}
