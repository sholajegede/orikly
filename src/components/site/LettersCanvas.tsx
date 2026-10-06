"use client";

import { useEffect, useState } from "react";
import type { SiteDesign } from "@convex/lib/design";
import { designVars, prettyDay } from "./SiteCanvas";

export type LetterItem = { id: string; when: string; text: string; photoUrl: string | null; photoId: string | null; opensOn: string | null };
type Props = {
  design: SiteDesign;
  slug: string;
  names: string;
  letters: LetterItem[];
  films: { format: string; url: string }[];
  homeHref: string;
  banner?: React.ReactNode;
  onTrack?: (name: string, props?: Record<string, string | number | boolean>) => void;
};

const TONES = ["", "loud", "dark"] as const;
const lead = (when: string) => (/^(your|our|my|the)\b/i.test(when) ? "Open on" : "Open when");

/** The "Open when…" page: sealed envelopes, each opening into one letter. What has been opened is remembered on this phone only. */
export function LettersCanvas({ design: d, slug, names, letters, films, homeHref, banner, onTrack }: Props) {
  const track = onTrack ?? (() => {});
  const [opened, setOpened] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [lifting, setLifting] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [told, setTold] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const key = `orikly_letters_${slug}`;
  // A sign-off like "Always, Shola" gives the name after the comma.
  const from = d.closing.sign?.split(",").pop()?.trim() || undefined;

  useEffect(() => {
    const now = new Date();
    setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
    try { setOpened(JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[]); } catch { /* private window */ }
    const wanted = window.location.hash.slice(1);
    if (wanted && letters.some((l) => l.id === wanted)) setOpen(wanted);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = (l: LetterItem) => !!l.opensOn && !!today && l.opensOn > today;
  const daysTo = (iso: string) => Math.max(1, Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000));
  const show = (id: string) => {
    setOpen(id);
    setCopied(false);
    history.replaceState(null, "", `#${id}`);
    if (!opened.includes(id)) {
      const next = [...opened, id];
      setOpened(next);
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* private window */ }
    }
    track("letter_open", { letter: id });
  };
  const tap = (l: LetterItem) => {
    if (locked(l)) return setTold(told === l.id ? null : l.id);
    setLifting(l.id);
    setTimeout(() => { setLifting(null); show(l.id); }, 520);
  };
  const close = () => { setOpen(null); history.replaceState(null, "", window.location.pathname); };
  const readable = letters.filter((l) => !locked(l));
  const at = readable.findIndex((l) => l.id === open);
  const cur = at >= 0 ? readable[at] : null;

  useEffect(() => {
    if (!cur) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(readable[(at + 1) % readable.length].id);
      if (e.key === "ArrowLeft") show(readable[(at - 1 + readable.length) % readable.length].id);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [cur?.id, at, readable.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`cz cz-letters ${d.caps ? "caps" : ""}`} style={designVars(d)}>
      {banner}
      <div className="cz-wrap">
        <div className="cz-poster">
          <div className="cz-marks" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="cz-top"><a href={homeHref}>← {names}</a><span>{opened.filter((id) => letters.some((l) => l.id === id)).length} of {letters.length} opened</span></div>
          <header className="cz-hero">
            <div className="ghost" aria-hidden="true">OPEN WHEN OPEN WHEN</div>
            <h1><span className="l">Open</span><span className="l a">when…</span></h1>
            <p className="sub">for {names}{from ? `, from ${from}` : ""}</p>
          </header>
        </div>
        <header className="cz-sec">
          <h2>{letters.length} letters.</h2>
          <p className="s">For the days ahead. Open the one you need.</p>
        </header>

        <div className="cz-envs">
          {letters.map((l, i) => {
            const isLocked = locked(l);
            return (
              <button key={l.id} className={`cz-env ${TONES[i % 3]} ${lifting === l.id ? "lift" : ""} ${opened.includes(l.id) ? "read" : ""}`} onClick={() => tap(l)} aria-label={`${lead(l.when)} ${l.when}${isLocked ? ", sealed" : ""}`}>
                <span className="env" aria-hidden="true"><i className="paper" /><i className="body" /><i className="flap" /><i className={`seal ${isLocked ? "lock" : ""}`}>{isLocked ? "" : opened.includes(l.id) ? "✓" : "♥"}</i></span>
                <span className="cz-lab">{lead(l.when)}</span>
                <span className="when">{l.when}.</span>
                {isLocked && told === l.id ? <span className="cz-chip">Sealed until {prettyDay(l.opensOn!)} · {daysTo(l.opensOn!)} day{daysTo(l.opensOn!) === 1 ? "" : "s"}</span> : isLocked ? <span className="cz-lab">Sealed</span> : null}
              </button>
            );
          })}
        </div>

        {films.length ? (
          <>
            <header className="cz-sec"><h2>The film.</h2></header>
            <div className="cz-films">{films.map((f) => <video key={f.url} className={f.format} src={f.url} controls playsInline preload="metadata" />)}</div>
          </>
        ) : null}
      </div>
      <footer className="cz-foot">Made with <a href={`${process.env.NEXT_PUBLIC_SITE_URL ?? "/"}?ref=letters-${slug}`}>Orikly</a>. Make yours.</footer>

      {cur ? (
        <div className="cz-read" role="dialog" aria-label={`${lead(cur.when)} ${cur.when}`}>
          <div className="bar"><span>{String(at + 1).padStart(2, "0")} / {String(readable.length).padStart(2, "0")}</span><button onClick={close}>Close</button></div>
          <div className="lsheet" key={cur.id}>
            {cur.photoUrl ? <img src={cur.photoUrl} alt="" style={{ objectPosition: cur.photoId && d.focus[cur.photoId] ? `${Math.round(d.focus[cur.photoId][0] * 100)}% ${Math.round(d.focus[cur.photoId][1] * 100)}%` : "50% 30%" }} /> : null}
            <div className="words">
              <p className="cz-lab">{lead(cur.when)}</p>
              <h2>{cur.when}.</h2>
              {cur.text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p.trim()}</p>)}
              {d.closing.sign ? <p className="name">{d.closing.sign}</p> : null}
              <div className="row">
                <button className="cz-btn" onClick={() => { void navigator.clipboard?.writeText(window.location.href); setCopied(true); }}>{copied ? "Link copied" : "Copy link to this letter"}</button>
                {readable.length > 1 ? <button className="cz-btn dark" onClick={() => show(readable[(at + 1) % readable.length].id)}>Next letter</button> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
