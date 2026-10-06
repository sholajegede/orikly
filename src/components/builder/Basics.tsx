"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { OCCASIONS, normalizeSlug } from "@convex/lib/constants";
import { daysUntil, prettyDate } from "@/lib/format";
import type { BuilderData, ProjectPatch } from "./shared";

export function Basics({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project } = data;
  const occ = OCCASIONS.find((o) => o.id === project.occasion)!;
  const [names, setNames] = useState(project.names);
  const [date, setDate] = useState(project.eventDate ?? "");
  const [slug, setSlug] = useState(project.slug);
  const live = project.status === "paid";
  const changesLeft = Math.max(0, 3 - (project.slugChanges ?? 0));
  const locked = live && changesLeft === 0;
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "orikly.ng";
  const days = date ? daysUntil(date) : null;

  useEffect(() => setNames(project.names), [project.names]);
  const check = useQuery(api.projects.checkSlug, slug !== project.slug ? { slug, projectId: project._id } : "skip");

  return (
    <div className="stack">
      <label className="field">
        <span>{occ.namesLabel}</span>
        <input type="text" value={names} maxLength={60} onChange={(e) => setNames(e.target.value)} onBlur={() => names.trim() !== project.names && void save({ names })} />
        <div className="hint">Shown in big letters at the top of your website and at the start of your videos.</div>
      </label>

      <label className="field">
        <span>{occ.dateLabel}</span>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); void save({ eventDate: e.target.value }); }} />
        {days === null ? <div className="hint">Pick the day of the celebration. If it has not happened yet, your website counts down to it for your guests.</div> : null}
      </label>
      {days !== null ? (
        <div className="explain">
          <span className="tag">{days > 0 ? `${days} ${days === 1 ? "day" : "days"} to go` : days === 0 ? "Today is the day" : "Already happened"}</span>
          <p>
            {days > 0
              ? `Your celebration is on ${prettyDate(date)}. Guests see this countdown on your website, and it drops by one every day until the day.`
              : days === 0
                ? "Your website tells guests that today is the day."
                : `Your website shows the date, ${prettyDate(date)}, with no countdown. That is fine for looking back on a day.`}
          </p>
        </div>
      ) : null}

      <label className="field">
        <span>Your link</span>
        <input type="text" value={slug} disabled={locked} autoCapitalize="none" onChange={(e) => setSlug(normalizeSlug(e.target.value))} />
        <div className="hint">This is the address you send to guests: <b>{slug}.{root}</b>. Keep it short and easy to say out loud.</div>
        {locked ? <div className="hint">You have changed this link 3 times. Contact us to change it again.</div> : live ? <div className="hint">Your website is live. If you change the link, the old one stops working, so send the new one to your guests. {changesLeft} change{changesLeft === 1 ? "" : "s"} left.</div> : null}
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
