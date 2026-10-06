import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { fontsHref, type SiteDesign } from "@convex/lib/design";
import { Card, Chip, EASE, Marks, Words, clamp, fit, ground, makeKit, pop, rise, useFonts, type FilmFormat, type Kit } from "./Film";

export type Letter = { id: string; when: string; text: string; photo: string | null; opensOn: string | null };
export type LettersData = { design: SiteDesign; names: string; from?: string; link?: string; letters: Letter[]; photos: { id: string; url: string }[]; songUrl: string | null };
export type LettersProps = { data: LettersData; format: FilmFormat };

const FPS = 30;
const TITLE = 4;
const GRID = 5;
const ENVELOPE = 2.2;
const SEALED = 3.6;
const CLOSING = 5.5;
const TONES = ["light", "loud", "dark"] as const;

const sealed = (l: Letter) => !!l.opensOn && l.opensOn > new Date().toISOString().slice(0, 10);
/** The first sentence or two of a letter: enough to feel it, short enough to read on screen. */
function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const sentences = flat.match(/[^.!?]+[.!?]+/g) ?? [flat];
  let out = "";
  for (const s of sentences) {
    if (out && (out + s).length > 120) break;
    out += s;
  }
  out = out.trim() || flat;
  return out.length > 150 ? `${out.slice(0, 147).replace(/\s+\S*$/, "")}…` : out;
}
const readSeconds = (l: Letter) => Math.min(8, 3 + excerpt(l.text).split(" ").length * 0.22);
export function lettersSeconds(letters: Letter[]): number {
  const whole = (s: number) => Math.round(s * FPS) / FPS;
  return TITLE + GRID + letters.reduce((n, l) => n + (sealed(l) ? whole(SEALED) : whole(ENVELOPE) + whole(readSeconds(l))), 0) + CLOSING;
}
function prettyDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** An envelope drawn in the design's colours. `open` runs 0 to 1: the flap lifts and the paper slides up. */
function Envelope({ k, tone, width, open = 0, lock, style }: { k: Kit; tone: (typeof TONES)[number]; width: number; open?: number; lock?: boolean; style?: CSSProperties }) {
  const c = k.d.colors;
  const body = tone === "dark" ? c.ink : tone === "loud" ? c.loud : c.card;
  const edge = tone === "dark" ? c.bg : c.ink;
  const seal = lock ? c.hi : tone === "loud" ? c.loudInk : c.loudDeep;
  const h = width * 0.66;
  const flap = interpolate(open, [0, 0.55], [0, 180], clamp);
  const paper = interpolate(open, [0.35, 1], [0, -h * 0.42], { ...clamp, easing: EASE });
  return (
    <div style={{ width, height: h, position: "relative", ...style }}>
      <div style={{ position: "absolute", left: "7%", right: "7%", top: "8%", height: "84%", background: c.card, borderRadius: width * 0.03, transform: `translateY(${paper}px)`, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }} />
      <div style={{ position: "absolute", inset: 0, background: body, borderRadius: width * 0.06, clipPath: open > 0.3 ? "polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%)" : undefined, boxShadow: open > 0.3 ? undefined : "0 18px 44px rgba(0,0,0,0.16)" }}>
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0 100%, 50% 46%, 100% 100%)", background: `color-mix(in srgb, ${edge} 7%, ${body})` }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "50%", transformOrigin: "50% 0%", transform: `perspective(${width * 3}px) rotateX(${flap}deg)`, clipPath: "polygon(0 0, 100% 0, 50% 96%)", background: `color-mix(in srgb, ${edge} 12%, ${body})`, borderRadius: `${width * 0.06}px ${width * 0.06}px 0 0`, opacity: flap > 90 ? 0.55 : 1 }} />
      {open < 0.25 ? <div style={{ position: "absolute", left: "50%", top: "50%", width: width * 0.15, height: width * 0.15, margin: -width * 0.075, borderRadius: "50%", background: seal, display: "grid", placeItems: "center", color: lock ? c.hiInk : body, fontSize: width * 0.075, opacity: interpolate(open, [0, 0.25], [1, 0], clamp) }}>{lock ? <span style={{ width: width * 0.05, height: width * 0.04, background: c.hiInk, borderRadius: width * 0.008, boxShadow: `0 ${-width * 0.028}px 0 ${-width * 0.008}px ${c.hi}, 0 ${-width * 0.028}px 0 0 ${c.hiInk}`, marginTop: width * 0.02 }} /> : "♥"}</div> : null}
    </div>
  );
}

function Top({ k, color, index, total }: { k: Kit; color: string; index: number; total: number }) {
  return (
    <div style={{ position: "absolute", top: 4.4 * k.u, left: 5 * k.u, right: 5 * k.u, display: "flex", justifyContent: "space-between", ...k.mono(2), color, opacity: 0.8 }}>
      <span>Open when…</span><span>{String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
    </div>
  );
}

function Intro({ k, data }: { k: Kit; data: LettersData }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = ground(k.d, "light");
  const size = Math.min(height * 0.2, width * 0.19);
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...k.display(Math.min(height * 0.4, width * 0.44)), position: "absolute", bottom: "6%", left: 0, whiteSpace: "nowrap", opacity: 0.06, transform: `translateX(${-f * 1.5}px)` }}>OPEN WHEN OPEN WHEN</div>
      <Marks color={g.fg} u={k.u} left={`${data.letters.length} letters · for ${data.names}`} />
      <div style={{ position: "relative", textAlign: k.tall ? "center" : "left" }}>
        <div style={{ ...k.display(size), lineHeight: 0.92 }}><span style={{ ...rise(f, 4), display: "inline-block" }}>Open&nbsp;</span><span style={{ ...rise(f, 11), display: "inline-block", color: k.d.colors.loudDeep }}>when…</span></div>
        <div style={{ ...k.display(size * 0.24), textAlign: "right", marginTop: 1.4 * k.u, ...rise(f, 22) }}>for {data.names}{data.from ? `, from ${data.from}` : ""}</div>
      </div>
    </AbsoluteFill>
  );
}

function Grid({ k, data }: { k: Kit; data: LettersData }) {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const g = ground(k.d, "light");
  const n = data.letters.length;
  const cols = k.tall ? (n <= 6 ? 2 : 3) : n <= 6 ? Math.max(3, n) : Math.ceil(n / 2);
  const w = Math.min((width - 14 * k.u) / cols - 2.4 * k.u, 42 * k.u);
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, alignItems: "center", justifyContent: "center", padding: 7 * k.u, gap: 5 * k.u }}>
      <Marks color={g.fg} u={k.u} />
      <div style={{ ...k.display((k.tall ? 9 : 7.4) * k.u), lineHeight: 1, textAlign: "center" }}><Words text={`${data.letters.length} letters. Open the one you need.`} frame={f} start={4} per={3.4} /></div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${3 * k.u}px ${2.4 * k.u}px`, width: "100%" }}>
        {data.letters.map((l, i) => {
          const a = pop(f, 22 + i * 4, 14);
          return (
            <div key={l.id} style={{ width: w, opacity: a, transform: `translateY(${(1 - a) * 3 * k.u}px) scale(${0.9 + a * 0.1})` }}>
              <Envelope k={k} tone={TONES[i % 3]} width={w} lock={sealed(l)} />
              <div style={{ ...k.mono(1.4), opacity: 0.7, marginTop: 1.2 * k.u }}>Open when</div>
              <div style={{ ...k.display((k.tall ? (cols === 2 ? 4.6 : 3.4) : 3.1) * k.u), lineHeight: 1.05 }}>{l.when}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function Opening({ k, l, tone, index, total }: { k: Kit; l: Letter; tone: (typeof TONES)[number]; index: number; total: number }) {
  const f = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const lock = sealed(l);
  const g = ground(k.d, tone === "light" ? "loud" : tone === "loud" ? "dark" : "light");
  const open = lock ? 0 : interpolate(f, [14, durationInFrames - 6], [0, 1], clamp);
  const shake = lock ? Math.sin(f / 1.6) * interpolate(f, [18, 30, 44, 56], [0, 2.2, 2.2, 0], clamp) : 0;
  const w = k.tall ? width * 0.64 : Math.min(width * 0.4, 64 * k.u);
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, alignItems: "center", justifyContent: "center", gap: 3.4 * k.u }}>
      <Marks color={g.fg} u={k.u} />
      <Top k={k} color={g.fg} index={index} total={total} />
      <Envelope k={k} tone={tone} width={w} open={open} lock={lock} style={{ transform: `rotate(${shake}deg) scale(${0.9 + pop(f, 0, 14) * 0.1})`, opacity: pop(f, 0, 8) }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ ...k.mono(k.tall ? 2.6 : 2.1), opacity: 0.75, ...rise(f, 6) }}>Open {/^(your|our|my|the)\b/i.test(l.when) ? "on" : "when"}</div>
        <div style={{ ...k.display(fit(l.when, [[16, 9.6], [28, 7.6]], 6.2) * k.u * (k.tall ? 1.25 : 1)), lineHeight: 1, ...rise(f, 9) }}>{l.when}.</div>
        {lock ? <div style={{ fontSize: 3.4 * k.u, marginTop: 1.6 * k.u, ...rise(f, 30) }}>Sealed until {prettyDay(l.opensOn!)}.</div> : null}
      </div>
    </AbsoluteFill>
  );
}

function Reading({ k, l, tone, index, total, flip }: { k: Kit; l: Letter; tone: (typeof TONES)[number]; index: number; total: number; flip: boolean }) {
  const f = useCurrentFrame();
  const g = ground(k.d, tone);
  const src = k.photo(l.photo ?? undefined);
  const body = excerpt(l.text);
  const big = src ? 1 : 1.3;
  const words = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2.4 * k.u, minWidth: 0, ...(src ? {} : { maxWidth: k.tall ? undefined : "74%", margin: "0 auto" }) }}>
      <div style={{ ...k.mono(k.tall ? 2.5 : 2.1), color: g.soft, ...rise(f, 3) }}>Open when</div>
      <div style={{ ...k.display(fit(l.when, [[14, 13], [24, 10.6], [36, 8.8]], 7.4) * k.u * (k.tall ? 1.2 : 1.1) * big), lineHeight: 0.98 }}><Words text={`${l.when}.`} frame={f} start={5} /></div>
      <div style={{ fontSize: (k.tall ? 5.8 : 4.7) * k.u * big, lineHeight: 1.34, fontWeight: 500 }}><Words text={body} frame={f} start={20} per={2.5} /></div>
      <div style={rise(f, 26 + body.split(" ").length * 2.5)}><Chip k={k} text="Still true" /></div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, padding: `${9 * k.u}px ${6 * k.u}px ${6 * k.u}px`, flexDirection: k.tall ? "column" : flip ? "row-reverse" : "row", gap: 4.4 * k.u }}>
      <Marks color={g.fg} u={k.u} />
      <Top k={k} color={g.fg} index={index} total={total} />
      {src ? <Card k={k} src={src} focus={k.focus(l.photo ?? undefined)} zoom={pop(f, 0, 90)} style={k.tall ? { flex: "0 0 52%" } : { flex: "0 0 40%" }} /> : null}
      {words}
    </AbsoluteFill>
  );
}

function Outro({ k, data }: { k: Kit; data: LettersData }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = ground(k.d, "loud");
  const size = Math.min(height * 0.15, width * 0.13);
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 6 * k.u }}>
      <Marks color={g.fg} u={k.u} />
      {Array.from({ length: 50 }, (_, i) => {
        const t = (f - 4 - random(`d${i}`) * 16) / 50;
        if (t < 0 || t > 1.2) return null;
        const s = (0.9 + random(`s${i}`) * 1.1) * k.u;
        return <i key={i} style={{ position: "absolute", left: random(`x${i}`) * width, top: -20 + t * (height + 60), width: s, height: s * 0.45, borderRadius: 2, background: [k.d.colors.hi, k.d.colors.card, k.d.colors.loudInk][i % 3], transform: `rotate(${t * (random(`r${i}`) * 720 - 360)}deg)` }} />;
      })}
      <div style={{ ...k.display(size), lineHeight: 0.94, ...rise(f, 4) }}>{data.letters.length} letters.</div>
      <div style={{ ...k.display(size * 0.56), lineHeight: 1, marginTop: 1.4 * k.u, ...rise(f, 12) }}>Open the one you need.</div>
      {data.link ? <div style={{ ...k.mono(2.1), background: g.fg, color: g.bg, borderRadius: 999, padding: `${1.1 * k.u}px ${2.6 * k.u}px`, marginTop: 4 * k.u, ...rise(f, 24) }}>{data.link}</div> : null}
      {data.from ? <><div style={{ ...k.mono(), marginTop: 3.6 * k.u, ...rise(f, 34) }}>Always,</div><div style={{ ...k.display(7 * k.u), ...rise(f, 38) }}>{data.from}</div></> : null}
    </AbsoluteFill>
  );
}

/** The "Open when…" film: every envelope opens in turn, and each letter gives up its first lines. */
export function Letters({ data, format }: LettersProps) {
  const d = data.design;
  const { width, height } = useVideoConfig();
  useFonts(d);
  const k = makeKit(d, format, width, height, data.photos);
  const total = Math.round(lettersSeconds(data.letters) * FPS);
  let from = 0;
  const parts: ReactNode[] = [];
  const add = (seconds: number, node: ReactNode) => {
    const frames = Math.round(seconds * FPS);
    parts.push(<Sequence key={parts.length} from={from} durationInFrames={frames}>{node}</Sequence>);
    from += frames;
  };
  add(TITLE, <Intro k={k} data={data} />);
  add(GRID, <Grid k={k} data={data} />);
  data.letters.forEach((l, i) => {
    const tone = TONES[i % 3];
    if (sealed(l)) return add(SEALED, <Opening k={k} l={l} tone={tone} index={i + 1} total={data.letters.length} />);
    add(ENVELOPE, <Opening k={k} l={l} tone={tone} index={i + 1} total={data.letters.length} />);
    add(readSeconds(l), <Reading k={k} l={l} tone={tone} index={i + 1} total={data.letters.length} flip={i % 2 === 1} />);
  });
  add(CLOSING, <Outro k={k} data={data} />);
  return (
    <AbsoluteFill style={{ background: d.colors.bg, fontFamily: `"${d.fonts.body}", system-ui, sans-serif`, color: d.colors.ink }}>
      <link rel="stylesheet" href={fontsHref(d)} />
      {parts}
      {data.songUrl ? <Audio src={data.songUrl} volume={(f) => interpolate(f, [0, 20, Math.max(21, total - 90), total], [0, 1, 1, 0], clamp)} /> : null}
    </AbsoluteFill>
  );
}
