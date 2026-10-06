import { textileDataUrl, type Textile } from "./textile";

/**
 * The instant video engine. One pure function draws any moment of a video onto a canvas.
 * The live preview and the recorder both call it, so what you see is what you download.
 */
export type ReelStyle = "cinematic" | "reel" | "storybook";
export type ReelPhoto = { src: CanvasImageSource; w: number; h: number };
export type ReelMove = "push" | "pull" | "left" | "right" | "up" | "hold";
/** One photo's place in the film: which photo, where the eye should rest, how the camera moves, how long. */
export type ReelShot = { photo: number; fx: number; fy: number; move: ReelMove; seconds: number; caption?: string };
/** The director's plan. When present it replaces the default order, timing and camera moves. */
export type ReelPlan = { shots: ReelShot[]; kicker?: string; closing?: string };

export type ReelScene = {
  names: string;
  occasion: string;
  dateLabel?: string;
  line?: string;
  photos: ReelPhoto[];
  accent: string;
  paper: string;
  ink: string;
  style: ReelStyle;
  watermark?: boolean;
  plan?: ReelPlan | null;
};
export type ReelFormat = "portrait" | "landscape";

export const REEL_SIZE: Record<ReelFormat, { w: number; h: number }> = {
  portrait: { w: 720, h: 1280 },
  landscape: { w: 1280, h: 720 },
};
export const MAX_REEL_PHOTOS = 14;

const INTRO = 2.8;
const OUTRO = 3.4;
const FADE = 0.5;
const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif';
const SANS = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';

const perPhoto = (s: ReelStyle) => (s === "reel" ? 1.9 : s === "storybook" ? 3 : 2.6);
const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

type Beat = { p: ReelPhoto; start: number; dur: number; shot: ReelShot | null };

/** The photo sequence with start times, from the director's plan when there is one. */
function beats(scene: ReelScene): Beat[] {
  const d = perPhoto(scene.style);
  const planned = (scene.plan?.shots ?? []).filter((s) => scene.photos[s.photo]).slice(0, MAX_REEL_PHOTOS);
  const list: { p: ReelPhoto; dur: number; shot: ReelShot | null }[] = planned.length >= 3
    ? planned.map((s) => ({ p: scene.photos[s.photo], dur: Math.min(4.2, Math.max(1.3, s.seconds)) * (scene.style === "reel" ? 0.8 : 1), shot: s }))
    : scene.photos.slice(0, MAX_REEL_PHOTOS).map((p) => ({ p, dur: d, shot: null }));
  let at = INTRO;
  return list.map((b) => {
    const beat = { ...b, start: at - FADE };
    at += b.dur;
    return beat;
  });
}

export function reelDuration(scene: ReelScene): number {
  return INTRO + beats(scene).reduce((sum, b) => sum + b.dur, 0) + OUTRO;
}

function cover(ctx: CanvasRenderingContext2D, p: ReelPhoto, x: number, y: number, w: number, h: number, zoom: number, px: number, py: number) {
  const s = Math.max(w / p.w, h / p.h) * zoom;
  const dw = p.w * s;
  const dh = p.h * s;
  ctx.drawImage(p.src, x + (w - dw) / 2 + (px * (dw - w)) / 2, y + (h - dh) / 2 + (py * (dh - h)) / 2, dw, dh);
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/[\s,.;:]+$/, "") + "…";
    return cut;
  }
  return lines;
}

/** Largest font size (within bounds) at which the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, maxW: number, start: number, min: number): number {
  let px = start;
  while (px > min) {
    ctx.font = font(px);
    if (ctx.measureText(text).width <= maxW) break;
    px -= 2;
  }
  return px;
}

const serif = (px: number) => `italic 400 ${px}px ${SERIF}`;
const sans = (px: number, weight = 500) => `${weight} ${px}px ${SANS}`;

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number) {
  ctx.font = sans(px, 600);
  const t = text.toUpperCase();
  let cx = x - (ctx.measureText(t).width + (t.length - 1) * px * 0.16) / 2;
  ctx.textAlign = "left";
  for (const ch of t) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + px * 0.16;
  }
  ctx.textAlign = "center";
}

function intro(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scene: ReelScene) {
  const u = Math.min(w, h) / 100;
  ctx.fillStyle = scene.accent;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fffdf8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const a = ease(t / 0.9);
  ctx.globalAlpha = a;
  label(ctx, scene.plan?.kicker || scene.occasion, w / 2, h / 2 - u * 17, u * 2.6);

  const size = fit(ctx, scene.names, serif, w * 0.84, u * 19, u * 8);
  ctx.font = serif(size);
  ctx.save();
  ctx.translate(w / 2, h / 2 + (1 - a) * u * 4);
  const s = 0.94 + 0.06 * a;
  ctx.scale(s, s);
  ctx.fillText(scene.names, 0, 0);
  ctx.restore();

  const line = ease((t - 0.5) / 0.9);
  ctx.globalAlpha = line;
  ctx.fillRect(w / 2 - (u * 9 * line), h / 2 + size * 0.62, u * 18 * line, Math.max(2, u * 0.3));
  if (scene.dateLabel) {
    ctx.font = sans(u * 3.4, 500);
    ctx.fillText(scene.dateLabel, w / 2, h / 2 + size * 0.62 + u * 6);
  }
  ctx.globalAlpha = 1;
}

/** Camera for one beat: zoom and pan at progress k, steered by the director's move and focus point when given. */
function camera(shot: ReelShot | null, i: number, k: number, style: ReelStyle): { zoom: number; px: number; py: number } {
  const dir = i % 2 === 0 ? 1 : -1;
  if (!shot) {
    return style === "reel"
      ? { zoom: 1.2 - 0.14 * ease(k * 2.4), px: dir * (k - 0.5) * 0.3, py: (k - 0.5) * 0.25 }
      : { zoom: 1.05 + 0.11 * k, px: dir * (k - 0.5) * 0.8, py: (k - 0.5) * 0.25 };
  }
  const bound = (x: number) => Math.max(-1, Math.min(1, x));
  const fx = -(shot.fx * 2 - 1);
  const fy = -(shot.fy * 2 - 1);
  const m = shot.move;
  const zoom = m === "push" ? 1.05 + 0.15 * k : m === "pull" ? 1.2 - 0.15 * k : m === "hold" ? 1.07 : 1.14;
  const dx = m === "left" ? 0.7 * (k - 0.5) : m === "right" ? -0.7 * (k - 0.5) : 0;
  const dy = m === "up" ? 0.6 * (k - 0.5) : 0;
  return { zoom, px: bound(fx + dx), py: bound(fy + dy) };
}

function photo(ctx: CanvasRenderingContext2D, w: number, h: number, i: number, k: number, alpha: number, scene: ReelScene, p: ReelPhoto, shot: ReelShot | null) {
  const u = Math.min(w, h) / 100;
  const dir = i % 2 === 0 ? 1 : -1;
  const cam = camera(shot, i, k, scene.style);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (scene.style === "storybook") {
    ctx.fillStyle = scene.paper;
    ctx.fillRect(0, 0, w, h);
    const m = u * 8;
    const cw = w - m * 2;
    const ch = h - m * 2 - u * 14;
    ctx.translate(w / 2, m + ch / 2);
    ctx.rotate(((dir * 1.4 * Math.PI) / 180) * (1 - 0.4 * k));
    ctx.shadowColor = "rgba(31,15,8,0.35)";
    ctx.shadowBlur = u * 5;
    ctx.shadowOffsetY = u * 2;
    ctx.fillStyle = "#fffdf8";
    rounded(ctx, -cw / 2 - u * 1.4, -ch / 2 - u * 1.4, cw + u * 2.8, ch + u * 2.8, u * 3.4);
    ctx.fill();
    ctx.shadowColor = "transparent";
    rounded(ctx, -cw / 2, -ch / 2, cw, ch, u * 2.4);
    ctx.clip();
    if (shot) cover(ctx, p, -cw / 2, -ch / 2, cw, ch, 1 + (cam.zoom - 1) * 0.6, cam.px, cam.py);
    else cover(ctx, p, -cw / 2, -ch / 2, cw, ch, 1.04 + 0.08 * k, dir * (k - 0.5) * 0.6, 0);
  } else {
    cover(ctx, p, 0, 0, w, h, cam.zoom, cam.px, cam.py);
    const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (scene.style === "reel" && k < 0.07) {
      ctx.globalAlpha = alpha * (1 - k / 0.07) * 0.85;
      ctx.fillStyle = scene.accent;
      ctx.fillRect(0, 0, w, h);
    }
  }
  ctx.restore();
}

function lowerThird(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number, scene: ReelScene, caption: string | undefined) {
  const u = Math.min(w, h) / 100;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "alphabetic";
  if (caption) {
    const dark = scene.style === "storybook";
    ctx.textAlign = dark ? "center" : "left";
    ctx.fillStyle = dark ? scene.ink : "#fffdf8";
    if (!dark) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = u * 2;
    }
    const px = u * 5.6;
    ctx.font = serif(px);
    const lines = wrap(ctx, caption, w * (dark ? 0.8 : 0.84), 2);
    lines.forEach((ln, i) => ctx.fillText(ln, dark ? w / 2 : u * 7, h - u * (dark ? 9 : 7) - (lines.length - 1 - i) * px * 1.12));
    ctx.restore();
    return;
  }
  if (scene.style === "storybook") {
    ctx.textAlign = "center";
    ctx.fillStyle = scene.ink;
    ctx.font = serif(fit(ctx, scene.names, serif, w * 0.8, u * 7, u * 4));
    ctx.fillText(scene.names, w / 2, h - u * 9);
  } else {
    ctx.textAlign = "left";
    ctx.fillStyle = "#fffdf8";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = u * 2;
    ctx.font = serif(fit(ctx, scene.names, serif, w * 0.84, u * 8, u * 4.5));
    ctx.fillText(scene.names, u * 7, h - u * 10);
    if (scene.dateLabel) {
      ctx.font = sans(u * 2.8, 500);
      ctx.fillText(scene.dateLabel, u * 7, h - u * 5.6);
    }
  }
  ctx.restore();
}

function outro(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number, t: number, scene: ReelScene) {
  const u = Math.min(w, h) / 100;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = scene.paper;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rise = (1 - ease(t / 0.9)) * u * 3;

  ctx.fillStyle = scene.accent;
  label(ctx, scene.occasion, w / 2, h / 2 - u * 22 + rise, u * 2.4);

  ctx.fillStyle = scene.ink;
  const size = fit(ctx, scene.names, serif, w * 0.84, u * 15, u * 7);
  ctx.font = serif(size);
  ctx.fillText(scene.names, w / 2, h / 2 - u * 9 + rise);

  const closing = scene.plan?.closing || scene.line;
  if (closing) {
    const px = u * 4;
    ctx.font = sans(px, 400);
    const lines = wrap(ctx, closing, w * 0.76, 4);
    lines.forEach((ln, i) => ctx.fillText(ln, w / 2, h / 2 + u * 3 + i * px * 1.3 + rise));
  }
  ctx.fillStyle = scene.accent;
  ctx.font = sans(u * 2.6, 600);
  ctx.fillText("orikly.ng", w / 2, h - u * 8);
  ctx.restore();
}

function watermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const u = Math.min(w, h) / 100;
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  ctx.font = sans(u * 4.4, 700);
  ctx.textAlign = "center";
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  const reach = Math.hypot(w, h);
  for (let y = -reach / 2; y < reach / 2; y += u * 16) {
    for (let x = -reach / 2; x < reach / 2; x += u * 40) {
      ctx.strokeText("PREVIEW  ORIKLY", x, y);
      ctx.fillText("PREVIEW  ORIKLY", x, y);
    }
  }
  ctx.restore();
}

/** Draw the frame at time t (seconds). */
export function drawReel(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scene: ReelScene) {
  const list = beats(scene);
  const total = reelDuration(scene);
  const outroAt = total - OUTRO;

  ctx.globalAlpha = 1;
  ctx.fillStyle = scene.paper;
  ctx.fillRect(0, 0, w, h);

  if (t < INTRO + FADE) intro(ctx, w, h, t, scene);

  let caption: string | undefined;
  list.forEach((b, i) => {
    if (t < b.start || t > b.start + b.dur + FADE * 2) return;
    photo(ctx, w, h, i, clamp((t - b.start) / (b.dur + FADE)), ease((t - b.start) / FADE), scene, b.p, b.shot);
    if (t >= b.start + FADE * 0.5) caption = b.shot?.caption;
  });

  if (list.length && t > INTRO && t < outroAt + FADE) {
    lowerThird(ctx, w, h, ease((t - INTRO) / 0.6) * (1 - ease((t - outroAt) / FADE)), scene, caption);
  }
  if (t > outroAt) outro(ctx, w, h, ease((t - outroAt) / FADE), t - outroAt, scene);
  if (scene.watermark) watermark(ctx, w, h);
}

export async function loadPhoto(url: string): Promise<ReelPhoto> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return { src: img, w: img.naturalWidth, h: img.naturalHeight };
}

export async function fileToPhoto(file: File): Promise<ReelPhoto> {
  const bmp = await createImageBitmap(file);
  return { src: bmp, w: bmp.width, h: bmp.height };
}

/** Cloth panels that stand in for photos until the visitor adds their own. */
export async function samplePhotos(): Promise<ReelPhoto[]> {
  const looks: [Textile, string, string][] = [
    ["adire", "#e6e8ff", "#2b2fa8"],
    ["asooke", "#e9b13c", "#7a3d0c"],
    ["ankara", "#f3d9b0", "#e4572e"],
    ["kente", "#e9b13c", "#1f7a55"],
    ["adire", "#f3eee4", "#b3123f"],
  ];
  return await Promise.all(
    looks.map(async ([kind, fg, bg]) => {
      const tile = await loadPhoto(textileDataUrl(kind, fg, bg, 3));
      const c = document.createElement("canvas");
      c.width = 900;
      c.height = 1200;
      const cx = c.getContext("2d")!;
      cx.fillStyle = cx.createPattern(tile.src as HTMLImageElement, "repeat")!;
      cx.fillRect(0, 0, c.width, c.height);
      return { src: c, w: c.width, h: c.height };
    }),
  );
}

export async function reelFontsReady() {
  try {
    await Promise.all([document.fonts.load(serif(40)), document.fonts.load(sans(40, 500)), document.fonts.load(sans(40, 600))]);
  } catch {
    /* fall back to system fonts */
  }
}

export function recordingSupport(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) return null;
  const options: [string, "mp4" | "webm"][] = [
    ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "mp4"],
    ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9,opus", "webm"],
    ["video/webm", "webm"],
  ];
  for (const [mime, ext] of options) if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return null;
}

/**
 * Play the video once into a hidden canvas and record it, with the song if there is one.
 * It records in real time, so a 40 second video takes 40 seconds. The tab must stay open and in front.
 */
export async function recordReel(
  scene: ReelScene,
  format: ReelFormat,
  opts: { audio?: ArrayBuffer | null; onProgress?: (p: number) => void } = {},
): Promise<{ blob: Blob; mime: string; ext: "mp4" | "webm" }> {
  const support = recordingSupport();
  if (!support) throw new Error("This browser cannot make videos. Try Chrome or Safari.");
  await reelFontsReady();

  const { w, h } = REEL_SIZE[format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const total = reelDuration(scene);
  drawReel(ctx, w, h, 0, scene);

  const tracks = [...canvas.captureStream(30).getVideoTracks()];
  let ac: AudioContext | null = null;
  if (opts.audio) {
    try {
      ac = new AudioContext();
      await ac.resume();
      const buffer = await ac.decodeAudioData(opts.audio.slice(0));
      const source = ac.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ac.createGain();
      const dest = ac.createMediaStreamDestination();
      source.connect(gain).connect(dest);
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.linearRampToValueAtTime(1, ac.currentTime + 0.6);
      gain.gain.setValueAtTime(1, ac.currentTime + total - 1.8);
      gain.gain.linearRampToValueAtTime(0.0001, ac.currentTime + total);
      source.start();
      tracks.push(...dest.stream.getAudioTracks());
    } catch {
      ac = null;
    }
  }

  const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: support.mime, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 128_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: support.mime.split(";")[0] }));
    recorder.onerror = () => reject(new Error("Recording stopped. Keep this page open and try again."));
  });

  recorder.start(1000);
  const began = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - began) / 1000;
      drawReel(ctx, w, h, Math.min(t, total), scene);
      opts.onProgress?.(Math.min(t / total, 1));
      if (t >= total + 0.15) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  const blob = await done;
  tracks.forEach((tr) => tr.stop());
  if (ac) void ac.close();
  return { blob, mime: support.mime.split(";")[0], ext: support.ext };
}
