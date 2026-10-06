"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { OCCASIONS, normalizeSlug } from "@convex/lib/constants";
import type { BuilderData, ProjectPatch } from "./shared";

export function Basics({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project } = data;
  const occ = OCCASIONS.find((o) => o.id === project.occasion)!;
  const [names, setNames] = useState(project.names);
  const [date, setDate] = useState(project.eventDate ?? "");
  const [slug, setSlug] = useState(project.slug);
  const locked = project.status === "paid";
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "orikly.ng";

  useEffect(() => setNames(project.names), [project.names]);
  const check = useQuery(api.projects.checkSlug, slug !== project.slug ? { slug, projectId: project._id } : "skip");

  return (
    <div className="stack">
      <label className="field">
        <span>{occ.namesLabel}</span>
        <input type="text" value={names} maxLength={60} onChange={(e) => setNames(e.target.value)} onBlur={() => names.trim() !== project.names && void save({ names })} />
      </label>
      <label className="field">
        <span>{occ.dateLabel}</span>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); void save({ eventDate: e.target.value }); }} />
        <div className="hint">If the date is still ahead, your website shows a countdown.</div>
      </label>
      <label className="field">
        <span>Your link</span>
        <input type="text" value={slug} disabled={locked} autoCapitalize="none" onChange={(e) => setSlug(normalizeSlug(e.target.value))} />
        <div className="hint">{slug}.{root}</div>
        {locked ? <div className="hint">Your link cannot change after payment. Contact support if you need a change.</div> : null}
        {check && !check.ok ? <div className="err" style={{ marginTop: 6 }}>{check.reason}</div> : null}
        {!locked && slug !== project.slug ? (
          <button type="button" className="btn small" style={{ marginTop: 8 }} disabled={!check?.ok} onClick={() => void save({ slug })}>
            Use this link
          </button>
        ) : null}
      </label>
    </div>
  );
}
