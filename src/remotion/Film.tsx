import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY_SCALE, DISPLAY_WEIGHT, filmSeconds, fontsHref, type Scene, type SiteDesign } from "@convex/lib/design";

export const FILM_FPS = 30;
export const FILM_SIZE = { portrait: { width: 1080, height: 1920 }, landscape: { width: 1920, height: 1080 } } as const;
export type FilmFormat = keyof typeof FILM_SIZE;
export type FilmData = {
  design: SiteDesign;
  names: string;
  occasion: string;
  eventDate: string | null;
  momentTitle?: string;
  momentAfter?: string;
  photos: { id: string; url: string }[];
  clips: { id: string; url: string }[];
  songUrl: string | null;
};
export type FilmProps = { data: FilmData; format: FilmFormat };

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const MONO = '"DM Mono", ui-monospace, Menlo, monospace';

type Kit = {
  d: SiteDesign;
  u: number;
  tall: boolean;
  display: (size: number, extra?: CSSProperties) => CSSProperties;
  mono: (size?: number) => CSSProperties;
  photo: (id?: string) => string | undefined;
  focus: (id?: string) => string;
  r: number;
};
type Ground = { bg: string; fg: string; card: string; soft: string };

function ground(d: SiteDesign, tone: Scene["tone"]): Ground {
  const c = d.colors;
  if (tone === "dark") return { bg: c.ink, fg: c.bg, card: `color-mix(in srgb, ${c.bg} 10%, ${c.ink})`, soft: `color-mix(in srgb, ${c.bg} 62%, ${c.ink})` };
  if (tone === "loud") return { bg: c.loud, fg: c.loudInk, card: c.card, soft: c.loudInk };
  return { bg: c.bg, fg: c.ink, card: c.card, soft: c.muted };
}

/** Rise into place: used for every piece of type. */
function rise(frame: number, delay = 0, dur = 16): CSSProperties {
  const k = interpolate(frame, [delay, delay + dur], [0, 1], { ...clamp, easing: EASE });
  return { opacity: k, transform: `translateY(${(1 - k) * 0.35}em)` };
}
function pop(frame: number, delay = 0, dur = 18): number {
  return interpolate(frame, [delay, delay + dur], [0, 1], { ...clamp, easing: EASE });
}
function fit(text: string, sizes: [number, number][], fallback: number): number {
  for (const [max, size] of sizes) if (text.length <= max) return size;
  return fallback;
}

function Marks({ color, u, left, right }: { color: string; u: number; left?: string; right?: string }) {
  const m = 2.2 * u;
  const s = 1.6 * u;
  const corner = (pos: CSSProperties, b: CSSProperties): CSSProperties => ({ position: "absolute", width: s, height: s, borderColor: color, borderStyle: "solid", borderWidth: 0, opacity: 0.6, ...pos, ...b });
  return (
    <>
      <i style={corner({ top: m, left: m }, { borderTopWidth: 2, borderLeftWidth: 2 })} />
      <i style={corner({ top: m, right: m }, { borderTopWidth: 2, borderRightWidth: 2 })} />
      <i style={corner({ bottom: m, left: m }, { borderBottomWidth: 2, borderLeftWidth: 2 })} />
      <i style={corner({ bottom: m, right: m }, { borderBottomWidth: 2, borderRightWidth: 2 })} />
      {left || right ? (
        <div style={{ position: "absolute", top: 4.4 * u, left: 5 * u, right: 5 * u, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 2 * u, color, opacity: 0.8 }}>
          <span>{left}</span><span>{right}</span>
        </div>
      ) : null}
    </>
  );
}

function Chip({ k, text }: { k: Kit; text: string }) {
  return <span style={{ background: k.d.colors.hi, color: k.d.colors.hiInk, borderRadius: 999, padding: `${0.5 * k.u}px ${1.6 * k.u}px`, fontFamily: MONO, fontSize: 2 * k.u, whiteSpace: "nowrap" }}>{text}</span>;
}

function Card({ k, src, focus, style, zoom = 0 }: { k: Kit; src: string; focus: string; style?: CSSProperties; zoom?: number }) {
  return (
    <div style={{ borderRadius: k.r, overflow: "hidden", background: k.d.colors.card, ...style }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: focus, transform: `scale(${1.08 - zoom * 0.08})` }} />
    </div>
  );
}

function Title({ k, data }: { k: Kit; data: FilmData }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = ground(k.d, "light");
  const lines = k.d.hero.lines;
  const longest = Math.max(...lines.map((l) => l.length), 6);
  const size = Math.min(height * 0.2, (width * 0.86) / (longest * 0.42));
  const ghost = data.eventDate ? `${data.eventDate.slice(8, 10)}·${data.eventDate.slice(5, 7)}` : "";
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, alignItems: "center", justifyContent: "center" }}>
      {ghost ? <div style={{ ...k.display(Math.min(height * 0.42, width * 0.5)), position: "absolute", bottom: "8%", left: 0, whiteSpace: "nowrap", opacity: 0.06, transform: `translateX(${-f * 1.6}px)` }}>{`${ghost} ${ghost} ${ghost} ${ghost}`}</div> : null}
      <Marks color={g.fg} u={k.u} left={k.d.hero.left} right={k.d.hero.right} />
      <div style={{ textAlign: "center", position: "relative" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ ...k.display(size), lineHeight: 0.9, color: i === k.d.hero.accent ? k.d.colors.loudDeep : g.fg, ...rise(f, 4 + i * 6) }}>{l}</div>
        ))}
        {k.d.hero.sub ? <div style={{ ...k.display(size * 0.26), textAlign: "right", marginTop: 1.6 * k.u, ...rise(f, 10 + lines.length * 6) }}>{k.d.hero.sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
}

function Caption({ k, text, frame }: { k: Kit; text: string; frame: number }) {
  return (
    <>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.82) 100%)" }} />
      <div style={{ position: "absolute", left: 6 * k.u, right: 6 * k.u, bottom: (k.tall ? 16 : 9) * k.u, color: "#fff", ...k.display(fit(text, [[26, 12], [48, 10], [80, 8.2]], 7) * k.u), lineHeight: 1, maxWidth: k.tall ? undefined : "62%", ...rise(frame, 10, 18) }}>{text}</div>
    </>
  );
}

function PhotoScene({ k, s }: { k: Kit; s: Scene }) {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const src = k.photo(s.photo);
  if (!src) return null;
  const zoom = interpolate(f, [0, durationInFrames], [1.12, 1], clamp);
  // On a wide screen a tall photo would lose its head, so it stands whole on a soft copy of itself.
  if (!k.tall) {
    const text = s.text ?? "";
    return (
      <AbsoluteFill style={{ background: "#000", color: "#fff", flexDirection: "row", alignItems: "center", gap: 6 * k.u, padding: `0 ${9 * k.u}px` }}>
        <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(${4 * k.u}px) brightness(0.55)`, transform: "scale(1.25)" }} />
        <Card k={k} src={src} focus={k.focus(s.photo)} zoom={pop(f, 0, durationInFrames)} style={{ position: "relative", height: "84%", aspectRatio: "4 / 5", flex: "0 0 auto", boxShadow: "0 30px 80px rgba(0,0,0,0.45)", transform: `scale(${0.96 + pop(f, 0, 20) * 0.04})` }} />
        {text ? <div style={{ position: "relative", ...k.display(fit(text, [[26, 12], [48, 10], [80, 8.2]], 7) * k.u), lineHeight: 1, ...rise(f, 10, 18) }}>{text}</div> : null}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: k.focus(s.photo), transform: `scale(${zoom})` }} />
      {s.text ? <Caption k={k} text={s.text} frame={f} /> : null}
    </AbsoluteFill>
  );
}

function ClipScene({ k, s, data }: { k: Kit; s: Scene; data: FilmData }) {
  const f = useCurrentFrame();
  const src = data.clips.find((c) => c.id === s.clip)?.url;
  if (!src) return null;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {s.text ? <Caption k={k} text={s.text} frame={f} /> : null}
    </AbsoluteFill>
  );
}

function Counter({ k, data }: { k: Kit; data: FilmData }) {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const count = k.d.count;
  if (!count) return null;
  const g = ground(k.d, "light");
  const target = /^\d{1,7}$/.test(count.value) ? Number(count.value) : null;
  const t = interpolate(f, [8, durationInFrames * 0.55], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const shown = target === null ? count.value : Math.round(target * t).toLocaleString("en-US");
  const around = data.photos.filter((p) => p.id !== k.d.hero.photo).slice(0, 4);
  const spots = k.tall
    ? [{ left: "-6%", top: "3%", r: -8 }, { right: "-8%", top: "6%", r: 7 }, { left: "-4%", bottom: "2%", r: 6 }, { right: "-6%", bottom: "4%", r: -7 }]
    : [{ left: "3%", top: "8%", r: -7 }, { right: "4%", top: "5%", r: 6 }, { left: "6%", bottom: "6%", r: 5 }, { right: "5%", bottom: "8%", r: -6 }];
  return (
    <AbsoluteFill style={{ background: g.bg, alignItems: "center", justifyContent: "center" }}>
      {around.map((p, i) => {
        const { r, ...pos } = spots[i];
        const a = pop(f, i * 4, 22);
        return <Card key={p.id} k={k} src={p.url} focus={k.focus(p.id)} zoom={a} style={{ position: "absolute", width: (k.tall ? 44 : 28) * k.u, aspectRatio: "4 / 5", ...pos, opacity: a, transform: `rotate(${r}deg) translateY(${(1 - a) * 8 * k.u + Math.sin((f + i * 20) / 30) * 0.6 * k.u}px)` }} />;
      })}
      <Marks color={g.fg} u={k.u} />
      <div style={{ width: (k.tall ? 80 : 66) * k.u, background: k.d.colors.loud, color: k.d.colors.loudInk, borderRadius: k.r * 1.3, padding: `${4 * k.u}px ${4.4 * k.u}px`, position: "relative", transform: `scale(${0.92 + pop(f, 0, 18) * 0.08})`, opacity: pop(f, 0, 10) }}>
        <div style={k.mono()}>{count.label}</div>
        <div style={{ ...k.display(24 * k.u), lineHeight: 1, margin: `${1.2 * k.u}px 0`, fontVariantNumeric: "tabular-nums" }}>{shown}</div>
        <div style={{ height: 3, background: "color-mix(in srgb, currentColor 22%, transparent)" }}><div style={{ height: "100%", width: `${t * 78}%`, background: "currentColor" }} /></div>
        {count.note ? <div style={{ fontSize: 2.4 * k.u, marginTop: 1.4 * k.u, ...rise(f, 24) }}>{count.note}</div> : null}
        {count.rows.map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 * k.u, borderTop: "2px dotted currentColor", marginTop: 1.6 * k.u, paddingTop: 1.3 * k.u, ...k.mono(), ...rise(f, durationInFrames * 0.45 + i * 8) }}>
            <span>{row.label}</span><b style={{ ...k.display(4 * k.u) }}>{row.value}</b>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Quote({ k, g, s, f, style }: { k: Kit; g: Ground; s: Scene; f: number; style?: CSSProperties }) {
  const text = s.text ?? "";
  return (
    <div style={{ background: g.card, color: g.fg, borderRadius: k.r, padding: 3.6 * k.u, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 2 * k.u, ...style }}>
      <div style={{ ...k.display(fit(text, [[24, 13], [44, 11], [70, 9]], 7.4) * k.u), lineHeight: 1.0, ...rise(f, 6) }}>{text}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: k.u, ...rise(f, 18) }}>
        <span style={{ ...k.mono(), color: g.soft }}>{s.meta ?? ""}</span>
        {s.chip ? <Chip k={k} text={s.chip} /> : null}
      </div>
    </div>
  );
}

function WallScene({ k, s, index, total, flip }: { k: Kit; s: Scene; index: number; total: number; flip: boolean }) {
  const f = useCurrentFrame();
  const g = ground(k.d, s.tone ?? "light");
  const [a, b] = (s.photos ?? []).map((id) => ({ id, src: k.photo(id) }));
  const pad = 5 * k.u;
  const pic = (p: { id: string; src?: string } | undefined, i: number, style: CSSProperties) =>
    p?.src ? <Card k={k} src={p.src} focus={k.focus(p.id)} zoom={pop(f, 6 + i * 5, 50)} style={{ ...style, opacity: pop(f, 6 + i * 5, 12), transform: `translateY(${(1 - pop(f, 6 + i * 5)) * 4 * k.u}px)` }} /> : null;
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, padding: pad, paddingTop: 8 * k.u }}>
      <div style={{ position: "absolute", top: 3.6 * k.u, left: pad, right: pad }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...k.mono(), color: g.soft }}><span>The wall</span><span>{String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></div>
        <div style={{ height: 3, background: "color-mix(in srgb, currentColor 16%, transparent)", marginTop: 1.2 * k.u }}><div style={{ height: "100%", width: `${(index / total) * 100}%`, background: k.d.colors.loudDeep }} /></div>
      </div>
      {k.tall ? (
        <div style={{ flex: 1, display: "flex", flexDirection: flip ? "column-reverse" : "column", gap: 2.4 * k.u, minHeight: 0 }}>
          <Quote k={k} g={g} s={s} f={f} style={{ flex: "0 0 40%" }} />
          <div style={{ flex: 1, display: "flex", gap: 2.4 * k.u, minHeight: 0 }}>{pic(a, 0, { flex: 1 })}{pic(b, 1, { flex: 1 })}</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: flip ? "row-reverse" : "row", gap: 2.4 * k.u, minHeight: 0 }}>
          <Quote k={k} g={g} s={s} f={f} style={{ flex: "0 0 46%" }} />
          {pic(a, 0, { flex: 1 })}{pic(b, 1, { flex: 1 })}
        </div>
      )}
    </AbsoluteFill>
  );
}

function LineScene({ k, s, flip }: { k: Kit; s: Scene; flip: boolean }) {
  const f = useCurrentFrame();
  const g = ground(k.d, s.tone ?? "dark");
  const src = k.photo(s.photo);
  const text = s.text ?? "";
  if (!src) return null;
  const words = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2.4 * k.u, minWidth: 0 }}>
      {s.meta ? <div style={{ ...k.mono(), color: g.soft, ...rise(f, 4) }}>{s.meta}</div> : null}
      <div style={{ ...k.display(fit(text, [[22, 14], [40, 11.6], [64, 9.6]], 8) * k.u), lineHeight: 1.0, ...rise(f, 8) }}>{text}</div>
      {s.chip ? <div style={rise(f, 20)}><Chip k={k} text={s.chip} /></div> : null}
    </div>
  );
  const pic = <Card k={k} src={src} focus={k.focus(s.photo)} zoom={pop(f, 0, 70)} style={k.tall ? { flex: "0 0 58%" } : { flex: "0 0 36%" }} />;
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, padding: 6 * k.u, flexDirection: k.tall ? "column" : flip ? "row-reverse" : "row", gap: 4 * k.u }}>
      <Marks color={g.fg} u={k.u} />
      {k.tall ? <>{pic}{words}</> : <>{pic}{words}</>}
    </AbsoluteFill>
  );
}

function Wish({ k, data }: { k: Kit; data: FilmData }) {
  const f = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const g = ground(k.d, "loud");
  const birthday = data.occasion === "birthday";
  const blow = durationInFrames * 0.52;
  const title = data.momentTitle ?? (birthday ? "Make a wish." : "Raise a glass.");
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 6 * k.u }}>
      <Marks color={g.fg} u={k.u} />
      <div style={{ ...k.display(fit(title, [[12, 17], [18, 13]], 10) * k.u), lineHeight: 0.95, ...rise(f, 2) }}>{title}</div>
      {birthday ? (
        <div style={{ display: "flex", gap: 3.4 * k.u, alignItems: "flex-end", height: 20 * k.u, marginTop: 5 * k.u }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const out = interpolate(f, [blow + i * 3, blow + i * 3 + 8], [1, 0], clamp);
            const flick = Math.sin((f + i * 11) / 3.2);
            return (
              <div key={i} style={{ width: 2 * k.u, height: (i % 2 ? 13 : 10.5) * k.u, borderRadius: 0.6 * k.u, background: `repeating-linear-gradient(135deg, ${k.d.colors.card} 0 ${1.1 * k.u}px, color-mix(in srgb, ${k.d.colors.loudInk} 40%, ${k.d.colors.card}) ${1.1 * k.u}px ${1.8 * k.u}px)`, position: "relative", ...rise(f, 8 + i * 3) }}>
                <div style={{ position: "absolute", left: "50%", bottom: "100%", width: 2.2 * k.u, height: 3.6 * k.u, marginLeft: -1.1 * k.u, marginBottom: 0.9 * k.u, background: k.d.colors.hi, borderRadius: "50% / 62% 62% 38% 38%", boxShadow: `0 0 ${3 * k.u}px ${0.8 * k.u}px ${k.d.colors.hi}`, transformOrigin: "50% 100%", transform: `rotate(${flick * 5}deg) scale(${out}, ${out * (1.05 + flick * 0.07)})`, opacity: out }} />
              </div>
            );
          })}
        </div>
      ) : null}
      <div style={{ fontSize: 3.8 * k.u, marginTop: 4 * k.u, maxWidth: 70 * k.u, ...rise(f, blow + 20) }}>{data.momentAfter ?? (birthday ? "I hope it comes true." : `To ${data.names}!`)}</div>
      {!birthday || f > blow + 6
        ? Array.from({ length: 60 }, (_, i) => {
            const start = (birthday ? blow + 6 : 10) + random(`d${i}`) * 20;
            const t = (f - start) / 55;
            if (t < 0 || t > 1.2) return null;
            const size = (0.9 + random(`s${i}`) * 1.2) * k.u;
            return <i key={i} style={{ position: "absolute", left: random(`x${i}`) * width, top: -20 + t * (height + 60), width: size, height: size * 0.45, borderRadius: 2, background: [k.d.colors.hi, k.d.colors.card, k.d.colors.loudInk][i % 3], transform: `rotate(${t * (random(`r${i}`) * 720 - 360)}deg)` }} />;
          })
        : null}
    </AbsoluteFill>
  );
}

function Closing({ k }: { k: Kit }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = ground(k.d, "loud");
  const c = k.d.closing;
  const longest = Math.max(...c.lines.map((l) => l.length), 6);
  const size = Math.min(height * 0.17, (width * 0.86) / (longest * 0.42));
  return (
    <AbsoluteFill style={{ background: g.bg, color: g.fg, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 6 * k.u }}>
      <Marks color={g.fg} u={k.u} />
      {c.lines.map((l, i) => <div key={i} style={{ ...k.display(size), lineHeight: 0.92, ...rise(f, 4 + i * 6) }}>{l}</div>)}
      {c.small ? <div style={{ fontSize: 3.7 * k.u, lineHeight: 1.4, maxWidth: 70 * k.u, marginTop: 3 * k.u, ...rise(f, 26) }}>{c.small}</div> : null}
      {c.sign ? <><div style={{ ...k.mono(), marginTop: 4 * k.u, ...rise(f, 36) }}>Always,</div><div style={{ ...k.display(7 * k.u), ...rise(f, 40) }}>{c.sign}</div></> : null}
    </AbsoluteFill>
  );
}

function useFonts(d: SiteDesign) {
  const [handle] = useState(() => delayRender("Loading the film's fonts", { timeoutInMilliseconds: 40_000 }));
  useEffect(() => {
    let alive = true;
    const wanted = [`${DISPLAY_WEIGHT[d.fonts.display] ?? 400} 40px "${d.fonts.display}"`, `400 20px "${d.fonts.body}"`, `400 20px "DM Mono"`];
    const patience = new Promise<void>((done) => setTimeout(done, 12_000));
    void Promise.race([document.fonts.ready.then(() => Promise.all(wanted.map((w) => document.fonts.load(w)))), patience]).catch(() => {}).then(() => alive && continueRender(handle));
    return () => { alive = false; };
  }, [handle, d.fonts.display, d.fonts.body]);
}

/** The celebration as a film: a title sequence cut from the same design as the website. */
export function Film({ data, format }: FilmProps) {
  const d = data.design;
  const { width, height, fps } = useVideoConfig();
  useFonts(d);
  const u = Math.min(width, height) / 100;
  const scale = DISPLAY_SCALE[d.fonts.display] ?? 1;
  const urls = new Map(data.photos.map((p) => [p.id, p.url]));
  const k: Kit = {
    d,
    u,
    tall: format === "portrait",
    r: { round: 3.4, soft: 2, sharp: 0.5 }[d.radius] * u,
    display: (size, extra) => ({ fontFamily: `"${d.fonts.display}", "Arial Narrow", Impact, sans-serif`, fontWeight: DISPLAY_WEIGHT[d.fonts.display] ?? 400, fontSize: size * scale, textTransform: d.caps ? "uppercase" : "none", letterSpacing: "-0.01em", ...extra }),
    mono: (size = 2.1) => ({ fontFamily: MONO, fontSize: size * u, letterSpacing: "0.03em" }),
    photo: (id) => (id ? urls.get(id) : undefined),
    focus: (id) => { const f = id ? d.focus[id] : undefined; return f ? `${Math.round(f[0] * 100)}% ${Math.round(f[1] * 100)}%` : "50% 30%"; },
  };
  const total = Math.round(filmSeconds(d) * fps);
  const walls = d.film.filter((s) => s.kind === "wall" || s.kind === "line").length;
  let from = 0;
  let wallNo = 0;
  const parts: ReactNode[] = d.film.map((s, i) => {
    const frames = Math.round(s.seconds * fps);
    const at = from;
    from += frames;
    if (s.kind === "wall" || s.kind === "line") wallNo += 1;
    const body =
      s.kind === "title" ? <Title k={k} data={data} /> :
      s.kind === "photo" ? <PhotoScene k={k} s={s} /> :
      s.kind === "clip" ? <ClipScene k={k} s={s} data={data} /> :
      s.kind === "counter" ? <Counter k={k} data={data} /> :
      s.kind === "wall" ? <WallScene k={k} s={s} index={wallNo} total={walls} flip={wallNo % 2 === 0} /> :
      s.kind === "line" ? <LineScene k={k} s={s} flip={wallNo % 2 === 0} /> :
      s.kind === "wish" ? <Wish k={k} data={data} /> :
      <Closing k={k} />;
    return <Sequence key={i} from={at} durationInFrames={frames}>{body}</Sequence>;
  });
  return (
    <AbsoluteFill style={{ background: d.colors.bg, fontFamily: `"${d.fonts.body}", system-ui, sans-serif`, color: d.colors.ink }}>
      <link rel="stylesheet" href={fontsHref(d)} />
      {parts}
      {data.songUrl ? <Audio src={data.songUrl} volume={(f) => interpolate(f, [0, 20, Math.max(21, total - 90), total], [0, 1, 1, 0], clamp)} /> : null}
    </AbsoluteFill>
  );
}
