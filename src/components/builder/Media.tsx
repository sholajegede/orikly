"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_PHOTOS, MAX_VIDEOS, MAX_VIDEO_BYTES } from "@convex/lib/constants";
import { compressImage } from "@/lib/compress";
import { uploadToStorage } from "@/lib/upload";
import { cleanError, mb } from "@/lib/format";
import type { BuilderData, ProjectPatch } from "./shared";

type Item = { key: string; name: string; kind: "photo" | "video"; progress: number; state: "working" | "done" | "error"; error?: string };

async function pool(tasks: (() => Promise<void>)[], size = 3) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, tasks.length) }, async () => {
      while (i < tasks.length) {
        const t = tasks[i++];
        await t();
      }
    }),
  );
}

export function Media({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project, assets } = data;
  const genUrl = useMutation(api.assets.generateUploadUrl);
  const addAsset = useMutation(api.assets.add);
  const removeAsset = useMutation(api.assets.remove);
  const reorder = useMutation(api.assets.reorder);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const photos = assets.filter((a) => a.kind === "photo").sort((a, b) => a.order - b.order);
  const videos = assets.filter((a) => a.kind === "video").sort((a, b) => a.order - b.order);

  const patch = (key: string, p: Partial<Item>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i)));

  async function handle(files: File[], kind: "photo" | "video") {
    const room = (kind === "photo" ? MAX_PHOTOS - photos.length : MAX_VIDEOS - videos.length) - items.filter((i) => i.kind === kind && i.state === "working").length;
    const wanted = files.filter((f) => f.type.startsWith(kind === "photo" ? "image/" : "video/"));
    const chosen = wanted.slice(0, Math.max(0, room));
    const skipped = files.length - chosen.length;
    const fresh: Item[] = chosen.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, kind, progress: 0, state: "working" }));
    if (skipped > 0) {
      fresh.push({ key: `skip-${Date.now()}`, name: `${skipped} file${skipped > 1 ? "s" : ""} skipped`, kind, progress: 1, state: "error", error: kind === "photo" ? `Limit is ${MAX_PHOTOS} photos, and only photos can be added here.` : `Limit is ${MAX_VIDEOS} videos, and only videos can be added here.` });
    }
    setItems((cur) => [...fresh, ...cur].slice(0, 40));

    const tasks = chosen.map((file, idx) => async () => {
      const key = fresh[idx].key;
      try {
        let blob: Blob = file;
        let contentType = file.type;
        let width: number | undefined;
        let height: number | undefined;
        if (kind === "photo") {
          const c = await compressImage(file);
          blob = c.blob;
          width = c.width;
          height = c.height;
          contentType = "image/jpeg";
        } else if (file.size > MAX_VIDEO_BYTES) {
          throw new Error(`This video is ${mb(file.size)}. The limit is ${mb(MAX_VIDEO_BYTES)}. Trim it on your phone first.`);
        }
        const url = await genUrl({});
        const storageId = await uploadToStorage(url, blob, contentType, (p) => patch(key, { progress: p }));
        await addAsset({ projectId: project._id, storageId: storageId as Id<"_storage">, kind, width, height });
        patch(key, { state: "done", progress: 1 });
        setTimeout(() => setItems((cur) => cur.filter((i) => i.key !== key)), 1500);
      } catch (e) {
        patch(key, { state: "error", error: cleanError(e) });
      }
    });
    await pool(tasks);
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...photos];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    await reorder({ projectId: project._id, orderedIds: next.map((p) => p._id) });
  }

  return (
    <div className="stack">
      <div>
        <h3 style={{ fontSize: 20 }}>Photos <span className="muted small">({photos.length} of {MAX_PHOTOS})</span></h3>
        <p className="muted small" style={{ margin: "4px 0 12px" }}>Pick your best photos. The first one is your cover. We shrink each photo on your phone before uploading, so it uses little data.</p>
        <div
          className={`drop ${over ? "over" : ""}`}
          onClick={() => photoInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void handle(Array.from(e.dataTransfer.files), "photo"); }}
        >
          <b>Tap to add photos</b>
          <div className="muted small">or drop them here</div>
        </div>
        <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => { void handle(Array.from(e.target.files ?? []), "photo"); e.target.value = ""; }} />
      </div>

      {items.filter((i) => i.kind === "photo").length ? <UploadList items={items.filter((i) => i.kind === "photo")} /> : null}

      {photos.length ? (
        <div className="thumbs">
          {photos.map((p, i) => (
            <div className="thumb" key={p._id}>
              {p.url ? <img src={p.url} alt="" loading="lazy" /> : null}
              {project.coverAssetId === p._id ? <span className="chip accent cover">Cover</span> : null}
              <div className="tools">
                <button title="Move earlier" onClick={() => void move(i, -1)}>←</button>
                <button title="Make cover" onClick={() => void save({ coverAssetId: p._id })}>★</button>
                <button title="Move later" onClick={() => void move(i, 1)}>→</button>
                <button title="Remove" onClick={() => void removeAsset({ assetId: p._id })}>×</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />

      <div>
        <h3 style={{ fontSize: 20 }}>Videos <span className="muted small">({videos.length} of {MAX_VIDEOS})</span></h3>
        <p className="muted small" style={{ margin: "4px 0 12px" }}>Short clips, each under {mb(MAX_VIDEO_BYTES)}. They play on your website and we can use them in your videos.</p>
        <button className="btn ghost" onClick={() => videoInput.current?.click()}>Add videos</button>
        <input ref={videoInput} type="file" accept="video/*" multiple hidden onChange={(e) => { void handle(Array.from(e.target.files ?? []), "video"); e.target.value = ""; }} />
      </div>

      {items.filter((i) => i.kind === "video").length ? <UploadList items={items.filter((i) => i.kind === "video")} /> : null}

      {videos.map((v) => (
        <div className="row card" key={v._id} style={{ padding: 10 }}>
          {v.url ? <video src={v.url} muted playsInline preload="metadata" style={{ width: 96, height: 64, objectFit: "cover", borderRadius: 8, background: "#000" }} /> : null}
          <div className="grow small muted">{mb(v.size)}</div>
          <button className="btn ghost small" onClick={() => void removeAsset({ assetId: v._id })}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function UploadList({ items }: { items: Item[] }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      {items.map((i) => (
        <div key={i.key}>
          <div className="row between small">
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{i.name}</span>
            <span className={i.state === "error" ? "err" : "muted"}>{i.state === "error" ? "Failed" : i.state === "done" ? "Done" : `${Math.round(i.progress * 100)}%`}</span>
          </div>
          {i.state === "error" ? <div className="err small">{i.error}</div> : <div className="bar"><i style={{ width: `${Math.round(i.progress * 100)}%` }} /></div>}
        </div>
      ))}
    </div>
  );
}
