"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { OCCASIONS } from "@convex/lib/constants";
import { DISPLAY_SCALE, DISPLAY_WEIGHT, type DesignSection, type SiteDesign, type Tile } from "@convex/lib/design";

/** Everything the designed website needs, with no backend attached. The live site, the editor preview,
 *  the studio's screenshots and the film all draw from this one shape. */
export type CanvasData = {
  design: SiteDesign;
  live: boolean;
  site: {
    slug: string;
    occasion: string;
    names: string;
    eventDate: string | null;
    eventTime: string | null;
    venue: string | null;
    mapUrl: string | null;
    dressCode: string | null;
    story: string | null;
    message: string | null;
    wishesOn: boolean;
    gift: { bank: string; name: string; number: string } | null;
  };
  photos: { id: string; url: string }[];
  clips: { id: string; url: string }[];
  films: { format: string; url: string }[];
  wishes: { guestName: string; message: string; createdAt: number }[];
};
type Props = {
  data: CanvasData;
  /** Load every picture at once. Used when the page is being photographed or filmed. */
  eager?: boolean;
  banner?: ReactNode;
  onTrack?: (name: string, props?: Record<string, string | number | boolean>) => void;
  onWish?: (name: string, message: string, trap: string) => Promise<void>;
  onShare?: () => void;
};

const TITLES: Record<DesignSection["type"], string> = { wall: "The wall.", moment: "Make a wish.", letter: "The letter.", details: "The day.", films: "The film.", gift: "Send a gift.", wishes: "Leave a wish." };
const RADIUS = { round: [34, 24], soft: [20, 14], sharp: [6, 4] } as const;

export function prettyDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export function designVars(d: SiteDesign): CSSProperties {
  const c = d.colors;
  return {
    "--bg": c.bg, "--card": c.card, "--ink": c.ink, "--muted": c.muted, "--loud": c.loud, "--loud-deep": c.loudDeep, "--loud-ink": c.loudInk, "--hi": c.hi, "--hi-ink": c.hiInk,
    "--df": `"${d.fonts.display}", "Arial Narrow", Impact, sans-serif`, "--bf": `"${d.fonts.body}", system-ui, sans-serif`,
    "--dw": String(DISPLAY_WEIGHT[d.fonts.display] ?? 400), "--ds": String(DISPLAY_SCALE[d.fonts.display] ?? 1),
    "--r": `${RADIUS[d.radius][0]}px`, "--rt": `${RADIUS[d.radius][1]}px`,
  } as CSSProperties;
}

/** Counts up once, the first time it scrolls into view. */
function CountUp({ value }: { value: string }) {
  const target = /^\d{1,7}$/.test(value) ? Number(value) : null;
  const [n, setN] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (target === null || !el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1600);
        setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      setN(0);
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target]);
  return <span ref={ref}>{target === null ? value : (n ?? target).toLocaleString("en-US")}</span>;
}

/** Ticks down to the day. Rendered only in the browser, so the cached page is the same for everyone. */
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
  return <div className="cz-down" aria-label="Time left until the day">{parts.map(([n, l]) => (<div key={l}><b>{n}</b><span>{l}</span></div>))}</div>;
}

function Moment({ birthday, names, button, after, onDone }: { birthday: boolean; names: string; button?: string; after?: string; onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [bits, setBits] = useState<{ x: number; d: number; r: number; c: number; s: number }[]>([]);
  const go = () => {
    setBits(Array.from({ length: 80 }, () => ({ x: Math.random() * 100, d: Math.random() * 0.7, r: Math.random() * 720 - 360, c: Math.floor(Math.random() * 3), s: 7 + Math.random() * 9 })));
    if (!done) onDone();
    setDone(true);
  };
  return (
    <div className={`cz-moment ${done ? "out" : ""}`}>
      {birthday ? <div className="cz-candles" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="cz-candle"><i style={{ transitionDelay: `${i * 0.12}s` }} /></div>)}</div> : null}
      {done ? <p className="cz-after" aria-live="polite">{after ?? (birthday ? "I hope it comes true." : `To ${names}!`)}</p> : <button className="cz-btn dark" onClick={go}>{button ?? (birthday ? "Blow out the candles" : "Throw confetti")}</button>}
      {bits.length ? <div className="cz-confetti" aria-hidden="true">{bits.map((b, i) => <i key={i} data-c={b.c} style={{ left: `${b.x}%`, width: b.s, height: b.s * 0.45, animationDelay: `${b.d}s`, ["--rot" as string]: `${b.r}deg` }} />)}</div> : null}
    </div>
  );
}

function Clip({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  return (
    <button className="cz-ph rv" onClick={() => { const v = ref.current; if (!v) return; v.muted = sound; setSound(!sound); void v.play().catch(() => {}); }}>
      <video ref={ref} src={url} muted loop autoPlay playsInline preload="metadata" />
      <span className="n">{sound ? "Sound on" : "Tap for sound"}</span>
    </button>
  );
}

export function SiteCanvas({ data, eager, banner, onTrack, onWish, onShare }: Props) {
  const { design: d, site, live } = data;
  const track = onTrack ?? (() => {});
  const [box, setBox] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [guest, setGuest] = useState("");
  const [msg, setMsg] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = new Map(data.photos.map((p) => [p.id, p.url]));
  const clipUrl = new Map(data.clips.map((c) => [c.id, c.url]));
  const order = data.photos.filter((p) => url.has(p.id));
  const at = (id?: string): CSSProperties => { const f = id ? d.focus[id] : undefined; return { objectPosition: f ? `${Math.round(f[0] * 100)}% ${Math.round(f[1] * 100)}%` : "50% 30%" }; };
  const occ = OCCASIONS.find((o) => o.id === site.occasion);
  const birthday = site.occasion === "birthday";
  const lazy = eager ? "eager" : "lazy";
  const open = (id: string) => { const i = order.findIndex((p) => p.id === id); if (i >= 0) { setBox(i); track("photo_open"); } };

  useEffect(() => {
    if (box === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBox(null);
      if (e.key === "ArrowRight") setBox((b) => (b === null ? b : (b + 1) % order.length));
      if (e.key === "ArrowLeft") setBox((b) => (b === null ? b : (b - 1 + order.length) % order.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [box, order.length]);

  const paras = [site.story, site.message].filter(Boolean).join("\n\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const has: Record<DesignSection["type"], (s: DesignSection) => boolean> = {
    wall: (s) => (s.tiles ?? []).some((t) => (t.t === "photo" && url.has(t.photo)) || (t.t === "clip" && clipUrl.has(t.clip))),
    moment: () => true,
    letter: () => paras.length > 0,
    details: () => !!(site.eventDate || site.venue || site.eventTime || site.dressCode),
    films: () => data.films.length > 0,
    gift: () => !!site.gift,
    wishes: () => site.wishesOn,
  };
  const shown = d.sections.filter((s) => !s.hidden && has[s.type](s));
  const heroUrl = d.hero.photo ? url.get(d.hero.photo) : undefined;
  const layout = heroUrl ? d.hero.layout : "poster";
  const ghost = site.eventDate ? `${site.eventDate.slice(8, 10)}·${site.eventDate.slice(5, 7)}` : "";
  const when = site.eventDate ? prettyDay(site.eventDate) : "";
  let photoNo = 0;

  const head = (s: DesignSection, extra?: string) => (
    <header className="cz-sec rv">
      {s.label ? <p className="cz-lab">{s.label}</p> : null}
      <h2>{s.title ?? (s.type === "moment" && !birthday ? "Raise a glass." : TITLES[s.type])}</h2>
      {s.sub ?? extra ? <p className="s">{s.sub ?? extra}</p> : null}
    </header>
  );

  const tile = (t: Tile, i: number) => {
    if (t.t === "quote") {
      return (
        <div key={i} className="cz-q rv">
          <blockquote>{t.text}</blockquote>
          <div className="meta">{t.meta ? <span className="cz-lab">{t.meta}</span> : <span />}{t.chip ? <span className="cz-chip">{t.chip}</span> : null}</div>
        </div>
      );
    }
    if (t.t === "clip") return clipUrl.has(t.clip) ? <Clip key={i} url={clipUrl.get(t.clip)!} /> : null;
    const u = url.get(t.photo);
    if (!u) return null;
    photoNo += 1;
    return (
      <button key={i} className={`cz-ph rv ${t.wide ? "wide" : ""}`} onClick={() => open(t.photo)} aria-label={`Open photo ${photoNo}`}>
        <img src={u} alt="" loading={lazy} style={at(t.photo)} />
        <span className="n">{String(photoNo).padStart(2, "0")}</span>
      </button>
    );
  };

  const section = (s: DesignSection, i: number) => {
    switch (s.type) {
      case "wall":
        return <section key={i} className="cz-wrap">{head(s, "Tap any photo to open it.")}<div className="cz-wall">{(s.tiles ?? []).map(tile)}</div></section>;
      case "moment":
        return (
          <section key={i} className="cz-wrap">
            <div className="cz-wish rv">
              {s.label ? <p className="cz-lab">{s.label}</p> : null}
              <h2>{s.title ?? (birthday ? TITLES.moment : "Raise a glass.")}</h2>
              <Moment birthday={birthday} names={site.names} button={s.button} after={s.after} onDone={() => track("moment_tap")} />
            </div>
          </section>
        );
      case "letter": {
        const pics = (s.photos ?? []).map((id) => ({ id, u: url.get(id) })).filter((p): p is { id: string; u: string } => !!p.u);
        const big = new Set(s.big ?? []);
        return (
          <section key={i} className="cz-wrap">
            {head(s)}
            <div className={`cz-letter ${pics.length ? "" : "solo"}`}>
              {pics.length ? <div className="cz-sticky rv"><img src={pics[0].u} alt="" loading={lazy} style={at(pics[0].id)} /></div> : null}
              <div className="cz-paras">
                {paras.map((p, k) => (
                  <div key={k} className={`cz-para rv ${big.has(k) ? "big" : ""}`}>
                    <p>{p}</p>
                    {pics.length > 1 && k > 0 && k % 3 === 0 && pics[(k / 3) % pics.length] ? <img className="inl" src={pics[(k / 3) % pics.length].u} alt="" loading={lazy} style={at(pics[(k / 3) % pics.length].id)} /> : null}
                  </div>
                ))}
                <div className="cz-para sign rv">
                  <p className="hb">{d.closing.lines.join(" ")}</p>
                  {d.closing.small ? <p>{d.closing.small}</p> : null}
                  {s.sign ?? d.closing.sign ? <p className="name">{s.sign ?? d.closing.sign}</p> : null}
                </div>
              </div>
            </div>
          </section>
        );
      }
      case "details":
        return (
          <section key={i} className="cz-wrap">
            {head(s)}
            <div className="cz-day rv">
              <div className="cz-count">
                <p className="cz-lab">{occ?.label ?? "The day"}</p>
                <p className="num small">{when || site.names}</p>
                {site.eventDate ? <Countdown date={site.eventDate} time={site.eventTime} /> : null}
                {site.eventTime ? <div className="ln"><span>Starts</span><b>{clock(site.eventTime)}</b></div> : null}
                {site.dressCode ? <div className="ln"><span>Colors of the day</span><b>{site.dressCode}</b></div> : null}
              </div>
              {site.venue ? (
                <div className="cz-say">
                  <p className="cz-lab">Where</p>
                  <p className="big">{site.venue}</p>
                  {site.mapUrl ? <div><a className="cz-btn" href={site.mapUrl} target="_blank" rel="noreferrer" onClick={() => track("map_open")}>Open in Maps</a></div> : null}
                </div>
              ) : null}
            </div>
          </section>
        );
      case "films":
        return (
          <section key={i} className="cz-wrap">
            {head(s)}
            <div className="cz-films rv">{data.films.map((f, k) => <video key={f.url} className={f.format} src={f.url} controls playsInline preload="metadata" onPlay={() => track("video_play", { n: k })} />)}</div>
          </section>
        );
      case "gift":
        return (
          <section key={i} className="cz-wrap">
            {head(s)}
            <div className="cz-gift rv">
              <p className="cz-lab">{site.gift!.bank}</p>
              <p className="num">{site.gift!.number}</p>
              <div className="ln"><span>Account name</span><b>{site.gift!.name}</b></div>
              <button className="cz-btn dark" onClick={() => { void navigator.clipboard?.writeText(site.gift!.number); setCopied(true); setTimeout(() => setCopied(false), 1600); track("gift_copy"); }}>{copied ? "Copied" : "Copy account number"}</button>
            </div>
          </section>
        );
      case "wishes":
        return (
          <section key={i} className="cz-wrap">
            {head(s)}
            <div className="cz-wishes rv">
              {live && onWish ? (
                <form className="cz-say" onSubmit={(e) => { e.preventDefault(); setBusy(true); setError(null); void onWish(guest, msg, trap).then(() => { setSent(true); setGuest(""); setMsg(""); }).catch((err: unknown) => setError(err instanceof Error ? err.message : "That did not send. Try again.")).finally(() => setBusy(false)); }}>
                  <label><span className="cz-lab">Your name</span><input type="text" required maxLength={60} value={guest} onChange={(e) => setGuest(e.target.value)} /></label>
                  <label><span className="cz-lab">Your wish</span><textarea required maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
                  <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} name="website" />
                  {error ? <p className="cz-err">{error}</p> : null}
                  {sent ? <p className="cz-ok">Thank you. Your wish shows once it has been approved.</p> : null}
                  <div><button className="cz-btn" disabled={busy}>{busy ? "Sending…" : "Send my wish"}</button></div>
                </form>
              ) : <div className="cz-say"><p className="big">Guests leave their wishes here once the website is live.</p></div>}
              {data.wishes.map((w, k) => <div key={`${w.createdAt}-${k}`} className="cz-q"><blockquote className="sm">{w.message}</blockquote><div className="meta"><span className="cz-lab">{w.guestName}</span></div></div>)}
            </div>
          </section>
        );
    }
  };

  const h1 = (
    <h1 className={d.caps ? "caps" : ""}>
      {d.hero.lines.map((l, i) => <span key={i} className={`l ${i === d.hero.accent ? "a" : ""}`}>{l}</span>)}
    </h1>
  );
  const tick = d.ticker.length ? d.ticker.map((n, i) => <span key={i}>{i % 2 ? <b>{n}</b> : n}<i>●</i></span>) : null;

  return (
    <div className={`cz ${d.caps ? "caps" : ""}`} style={designVars(d)}>
      {banner}
      <div className="cz-wrap">
        <div className={`cz-poster ${layout}`}>
          <div className="cz-marks" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="cz-top"><span>{d.hero.left ?? [occ?.label, when].filter(Boolean).join(" · ")}</span><span>{d.hero.right ?? ""}</span></div>
          {layout === "poster" ? (
            <header className="cz-hero">
              {ghost ? <div className="ghost" aria-hidden="true">{ghost} {ghost} {ghost}</div> : null}
              {h1}
              {d.hero.sub ? <p className="sub">{d.hero.sub}</p> : null}
            </header>
          ) : layout === "split" ? (
            <header className="cz-hero split">
              <div>{h1}{d.hero.sub ? <p className="sub">{d.hero.sub}</p> : null}</div>
              <div className="pic"><img src={heroUrl} alt="" style={at(d.hero.photo)} /></div>
            </header>
          ) : (
            <header className="cz-hero cover">
              <img src={heroUrl} alt="" style={at(d.hero.photo)} />
              <div className="over">{h1}{d.hero.sub ? <p className="sub">{d.hero.sub}</p> : null}</div>
            </header>
          )}
        </div>
      </div>

      {tick ? <div className="cz-ticker" aria-hidden="true"><div className="run"><span className="tk">{tick}{tick}</span><span className="tk">{tick}{tick}</span></div></div> : null}

      {d.opener || d.count ? (
        <div className="cz-wrap">
          <section className={`cz-duo ${d.opener && d.count ? "" : "one"}`}>
            {d.opener ? (
              <div className="cz-say rv">
                <p className="cz-lab head"><span>{d.opener.from ?? ""}</span><span>{d.opener.to ?? ""}</span></p>
                <p className="big">{d.opener.text}</p>
                <div className="row"><span className="cz-lab">{data.photos.length} photos{paras.length ? ", then the letter" : ""}</span></div>
              </div>
            ) : null}
            {d.count ? (
              <div className="cz-count rv">
                <p className="cz-lab">{d.count.label}</p>
                <p className="num"><CountUp value={d.count.value} /></p>
                <div className="meter"><i /></div>
                {d.count.note ? <p className="small">{d.count.note}</p> : null}
                {d.count.rows.map((r, i) => <div key={i} className="ln"><span>{r.label}</span><b>{r.value}</b></div>)}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {shown.map(section)}

      {live && onShare ? <div className="cz-wrap"><div className="cz-share rv"><p>Send this to someone who should see it.</p><button className="cz-btn" onClick={onShare}>Share on WhatsApp</button></div></div> : null}
      <footer className="cz-foot">Made with <a href={`${process.env.NEXT_PUBLIC_SITE_URL ?? "/"}?ref=site-${site.slug}`} onClick={() => track("footer_click")}>Orikly</a>. Make yours.</footer>

      {box !== null && order[box] ? (
        <div className="cz-lb" role="dialog" aria-label="Photo" onClick={() => setBox(null)}>
          <div className="bar t"><span>{String(box + 1).padStart(2, "0")} / {String(order.length).padStart(2, "0")}</span><button onClick={() => setBox(null)}>Close</button></div>
          <img src={order[box].url} alt="" />
          <div className="bar b" onClick={(e) => e.stopPropagation()}><button onClick={() => setBox((box - 1 + order.length) % order.length)}>Back</button><button onClick={() => setBox((box + 1) % order.length)}>Next</button></div>
        </div>
      ) : null}
    </div>
  );
}
