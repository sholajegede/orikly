import { useEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { fontsHref } from "@convex/lib/design";
import { SiteCanvas, type CanvasData } from "../components/site/SiteCanvas";

export const SHOT_VIEW = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } } as const;
export type ShotProps = { data: CanvasData; view: keyof typeof SHOT_VIEW; offset: number };

/** One screen of the real website, scrolled to `offset`, so the art director can look at its own work. */
export function Shot({ data, view, offset }: ShotProps) {
  const [handle] = useState(() => delayRender("Waiting for the page's fonts and pictures", { timeoutInMilliseconds: 60_000 }));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const pictures = Array.from(ref.current?.querySelectorAll("img") ?? []).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((done) => { img.onload = img.onerror = () => done(); })));
    const patience = new Promise<void>((done) => setTimeout(done, 25_000));
    void Promise.race([Promise.all([document.fonts.ready, ...pictures]), patience]).then(() => alive && continueRender(handle));
    return () => { alive = false; };
  }, [handle]);

  return (
    <div style={{ width: SHOT_VIEW[view].width, height: SHOT_VIEW[view].height, overflow: "hidden", background: data.design.colors.bg }}>
      <link rel="stylesheet" href={fontsHref(data.design)} />
      <div ref={ref} style={{ transform: `translateY(${-offset}px)` }}>
        <SiteCanvas data={data} eager />
      </div>
    </div>
  );
}
