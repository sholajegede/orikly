import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { logger, task } from "@trigger.dev/sdk";

/**
 * Makes one paid celebration, start to finish, with nobody watching:
 *   1. the art director designs the website and the film,
 *   2. the website is photographed and the art director reviews its own work, twice,
 *   3. both films are rendered with the customer's song and saved.
 * The backend half is convex/studio.ts. Both sides hold STUDIO_SECRET.
 */
const REVIEWS = 2;
const PHONE_SCREENS = [0, 1, 2, 4, 6];
const DESKTOP_SCREENS = [0, 1, 3];

function projectRoot(): string {
  for (const start of [process.cwd(), process.env.INIT_CWD, process.env.PWD].filter((x): x is string => !!x)) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (existsSync(path.join(dir, "src/remotion/index.ts"))) return dir;
      dir = path.dirname(dir);
    }
  }
  throw new Error("Cannot find src/remotion/index.ts from the job's working folder.");
}

export const produce = task({
  id: "produce-celebration",
  maxDuration: 2400,
  retry: { maxAttempts: 1 },
  run: async ({ projectId }: { projectId: string }) => {
    const site = process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    const secret = process.env.STUDIO_SECRET;
    if (!site || !secret) throw new Error("Set STUDIO_SECRET and NEXT_PUBLIC_CONVEX_SITE_URL for the studio job.");

    const call = async <T = Record<string, unknown>>(route: string, body: Record<string, unknown> = {}): Promise<T> => {
      const res = await fetch(`${site}/studio/${route}`, { method: "POST", headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ projectId, ...body }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `The studio backend answered ${res.status} on ${route}.`);
      return data as T;
    };
    const store = async (file: string, type: string): Promise<string> => {
      const { url } = await call<{ url: string }>("upload");
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": type }, body: readFileSync(file) });
      if (!res.ok) throw new Error(`Could not store ${path.basename(file)}.`);
      return ((await res.json()) as { storageId: string }).storageId;
    };
    const stage = (name: string, note?: string) => call("stage", { stage: name, note });

    const work = mkdtempSync(path.join(tmpdir(), "orikly-"));
    try {
      await stage("designing");
      const first = await call<{ notes: string }>("design");
      logger.log("First design", { notes: first.notes });

      const root = projectRoot();
      const { bundle } = await import("@remotion/bundler");
      const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
      const serveUrl = await bundle({
        entryPoint: path.join(root, "src/remotion/index.ts"),
        webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, alias: { ...(config.resolve?.alias ?? {}), "@convex": path.join(root, "convex"), "@": path.join(root, "src") } } }),
      });

      type Gathered = { design: unknown; site: Record<string, unknown>; photos: { id: string; url: string }[]; clips: { id: string; url: string }[]; songUrl: string | null };
      const canvas = (g: Gathered) => ({ design: g.design, live: true, site: g.site, photos: g.photos, clips: g.clips, films: [], wishes: [] });

      for (let round = 1; round <= REVIEWS; round++) {
        await stage("reviewing", `Look ${round} of ${REVIEWS}`);
        const g = await call<Gathered>("gather");
        const shots: string[] = [];
        const views = [...PHONE_SCREENS.map((n) => ({ view: "phone", offset: n * 844, scale: 1.6 })), ...DESKTOP_SCREENS.map((n) => ({ view: "desktop", offset: n * 800, scale: 1 }))];
        for (const [i, v] of views.entries()) {
          const inputProps = { data: canvas(g), view: v.view, offset: v.offset };
          const composition = await selectComposition({ serveUrl, id: "Shot", inputProps });
          const output = path.join(work, `shot-${round}-${i}.jpeg`);
          await renderStill({ composition, serveUrl, output, inputProps, imageFormat: "jpeg", jpegQuality: 82, scale: v.scale, timeoutInMilliseconds: 90_000 });
          shots.push(await store(output, "image/jpeg"));
        }
        const review = await call<{ notes: string }>("design", { shots });
        logger.log(`Review ${round}`, { notes: review.notes });
      }

      const g = await call<Gathered & { site: { names: string; occasion: string; eventDate: string | null } }>("gather");
      const moment = ((g.design as { sections?: { type: string; title?: string; after?: string }[] }).sections ?? []).find((s) => s.type === "moment");
      const data = { design: g.design, names: g.site.names, occasion: g.site.occasion, eventDate: g.site.eventDate, momentTitle: moment?.title, momentAfter: moment?.after, photos: g.photos, clips: g.clips, songUrl: g.songUrl };
      for (const [n, format] of (["portrait", "landscape"] as const).entries()) {
        await stage("filming", `Film ${n + 1} of 2`);
        const inputProps = { data, format };
        const composition = await selectComposition({ serveUrl, id: "Film", inputProps });
        const outputLocation = path.join(work, `${format}.mp4`);
        await renderMedia({ composition, serveUrl, codec: "h264", crf: 22, outputLocation, inputProps, timeoutInMilliseconds: 120_000, onProgress: ({ progress }) => { if (Math.round(progress * 100) % 25 === 0) logger.log(`${format} ${Math.round(progress * 100)}%`); } });
        await call("film", { storageId: await store(outputLocation, "video/mp4"), format });
      }
      await stage("done");
      return { ok: true };
    } catch (e) {
      const note = e instanceof Error ? e.message : "The studio stopped unexpectedly.";
      await stage("failed", note.slice(0, 180)).catch(() => {});
      throw e;
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  },
});
