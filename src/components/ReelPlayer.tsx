"use client";

import { useEffect, useRef } from "react";
import { REEL_SIZE, drawReel, reelDuration, reelFontsReady, type ReelFormat, type ReelScene } from "@/lib/reel";

const PREVIEW_SCALE = 0.75;

/** Plays a video scene live on a canvas, on a loop. Nothing is uploaded or recorded here. */
export function ReelPlayer({ scene, format, label }: { scene: ReelScene | null; format: ReelFormat; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { w, h } = REEL_SIZE[format];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = w * PREVIEW_SCALE;
    canvas.height = h * PREVIEW_SCALE;
    ctx.setTransform(PREVIEW_SCALE, 0, 0, PREVIEW_SCALE, 0, 0);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = reelDuration(scene) + 0.8;
    let raf = 0;
    let visible = true;
    let alive = true;
    const began = performance.now();

    const frame = () => {
      if (!alive) return;
      if (visible) drawReel(ctx, w, h, Math.min(((performance.now() - began) / 1000) % total, total - 0.8), scene);
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.05 });
    io.observe(canvas);

    void reelFontsReady().then(() => {
      if (!alive) return;
      if (still) drawReel(ctx, w, h, 1.6, scene);
      else raf = requestAnimationFrame(frame);
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [scene, w, h]);

  return <canvas ref={ref} className={`reel ${format}`} role="img" aria-label={label ?? "Video preview"} style={{ aspectRatio: `${w} / ${h}` }} />;
}
