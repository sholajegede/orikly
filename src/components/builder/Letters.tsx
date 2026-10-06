"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { COST, MAX_LETTERS, MIN_LETTERS } from "@convex/lib/constants";
import { cleanError } from "@/lib/format";
import type { BuilderData } from "./shared";

type Letter = { id: string; when: string; text: string; photo?: Id<"assets">; opensOn?: string };
const IDEAS = ["you're tired", "you doubt yourself", "you miss me", "you need to laugh", "you need to feel loved", "life feels heavy", "you need a prayer", "we are not talking", "you forget how beautiful you are", "you wonder about our future", "your birthday", "our anniversary"];
const newId = () => Math.random().toString(36).slice(2, 10);

/** "Open when…": short letters, each sealed in an envelope with one photo. Writing them is free. */
export function Letters({ data }: { data: BuilderData }) {
  const { project, assets } = data;
  const saveLetters = useMutation(api.projects.saveLetters);
  const runStudio = useMutation(api.studio.run);
  const me = useQuery(api.users.me);
  const [list, setList] = useState<Letter[]>(() => (project.letters ?? []) as Letter[]);
  const [openId, setOpenId] = useState<string | null>(list[0]?.id ?? null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photos = assets.filter((a) => a.kind === "photo" && a.url).sort((a, b) => a.order - b.order);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function change(next: Letter[]) {
    setList(next);
    setState("saving");
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveLetters({ id: project._id, letters: next }).then(() => setState("saved")).catch((e) => { setError(cleanError(e)); setState("idle"); });
    }, 700);
  }
  const edit = (id: string, patch: Partial<Letter>) => change(list.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const add = (when: string) => {
    const used = new Set(list.map((l) => l.photo));
    const l: Letter = { id: newId(), when, text: "", photo: photos.find((p) => !used.has(p._id))?._id };
    change([...list, l]);
    setOpenId(l.id);
  };

  const ready = list.filter((l) => l.when.trim() && l.text.trim()).length;
  const live = project.status === "paid";
  const working = !!project.studio && project.studio.stage !== "done" && project.studio.stage !== "failed";
  const have = me?.credits ?? 0;
  const cost = project.lettersOn ? COST.refilm * 2 : COST.letters;
  const unused = IDEAS.filter((i) => !list.some((l) => l.when.toLowerCase() === i));

  return (
    <div className="stack">
      <div className="explain">
        <span className="tag">Add-on · {COST.letters} credits</span>
        <p>Short letters for the days ahead, each sealed in its own envelope: "Open when you're tired", "Open when you miss me". They get their own page and their own film. Writing them is free. You pay only when you publish the set. {state === "saving" ? "Saving…" : state === "saved" ? "Saved." : ""}</p>
      </div>
      {error ? <div className="err">{error}</div> : null}

      {list.map((l, i) => {
        const open = openId === l.id;
        return (
          <div key={l.id} className="part">
            <div className="part-h" style={{ alignItems: "center" }}>
              <button type="button" className="linkish" style={{ textDecoration: "none", color: "inherit", textAlign: "left" }} onClick={() => setOpenId(open ? null : l.id)}>
                <small className="muted" style={{ display: "block", font: "500 11px var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Letter {i + 1}{l.text.trim() ? "" : " · not written yet"}</small>
                <b style={{ fontSize: 19 }}>Open when {l.when || "…"}</b>
              </button>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn ghost small" onClick={() => setOpenId(open ? null : l.id)}>{open ? "Close" : "Write"}</button>
                <button type="button" className="btn ghost small" aria-label="Remove this letter" onClick={() => change(list.filter((x) => x.id !== l.id))}>×</button>
              </div>
            </div>
            {open ? (
              <div className="stack">
                <label className="field"><span>Open when…</span><input type="text" maxLength={48} value={l.when} placeholder="you're tired" onChange={(e) => edit(l.id, { when: e.target.value })} /><div className="hint">Finish the sentence. It goes on the envelope.</div></label>
                <label className="field"><span>The letter</span><textarea maxLength={1500} style={{ minHeight: 150 }} value={l.text} placeholder="Write it the way you would say it. A few sentences is enough." onChange={(e) => edit(l.id, { text: e.target.value })} /><div className="hint">{l.text.length} of 1500. The first sentence or two also appear in the film.</div></label>
                <div>
                  <div className="hint" style={{ marginBottom: 8 }}>The photo inside</div>
                  <div className="cover-thumbs">
                    {photos.map((p) => <button key={p._id} type="button" className={l.photo === p._id ? "on" : ""} aria-label="Use this photo" onClick={() => edit(l.id, { photo: l.photo === p._id ? undefined : p._id })}><img src={p.url as string} alt="" loading="lazy" /></button>)}
                  </div>
                </div>
                <label className="field"><span>Keep sealed until (optional)</span><input type="date" value={l.opensOn ?? ""} onChange={(e) => edit(l.id, { opensOn: e.target.value || undefined })} /><div className="hint">For an anniversary or a birthday. The envelope shows a lock and a countdown until that day.</div></label>
              </div>
            ) : null}
          </div>
        );
      })}

      {list.length < MAX_LETTERS ? (
        <div className="part">
          <div className="part-h"><div><h3>{list.length ? "Add another" : "Start with one"}</h3><p>Pick an idea or write your own. {MIN_LETTERS} letters make a set, and you can have up to {MAX_LETTERS}.</p></div></div>
          <div className="pills light-ground">
            {unused.slice(0, 8).map((i) => <button key={i} type="button" onClick={() => add(i)}>{i}</button>)}
            <button type="button" onClick={() => add("")}>Write my own</button>
          </div>
        </div>
      ) : null}

      {list.length ? (
        <div className="director">
          <div className="grow">
            <b>{project.lettersOn ? "Your letters are live" : ready >= MIN_LETTERS ? "Ready to publish" : `Write ${MIN_LETTERS - ready} more to make a set`}</b>
            <span>{project.lettersOn ? "Changes to the letters show on the page right away, free. Make the film again when you want it to match." : live ? `Publishing makes the page and its film. You have ${have} credit${have === 1 ? "" : "s"}.` : "You can add them when you go live on the last step, or any time after."}</span>
          </div>
          <a className="btn ghost small" style={{ color: "inherit" }} href={`/app/preview/${project.slug}/open-when`} target="_blank" rel="noreferrer">Preview</a>
          {live ? <button className="btn small" disabled={busy || working || ready < MIN_LETTERS || have < cost} onClick={() => { setBusy(true); setError(null); void runStudio({ id: project._id, what: "letters" }).catch((e) => setError(cleanError(e))).finally(() => setBusy(false)); }}>{working ? "Studio is working…" : project.lettersOn ? `Make the film again · ${cost} credits` : `Publish my letters · ${cost} credits`}</button> : null}
        </div>
      ) : null}
      {live && list.length && have < cost && ready >= MIN_LETTERS ? <p className="hint" style={{ margin: 0 }}>You need {cost} credits. <a href="/app/credits"><b>Get more credits</b></a>.</p> : null}
    </div>
  );
}
