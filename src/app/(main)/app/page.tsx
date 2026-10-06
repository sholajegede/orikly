"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { daysUntil, siteUrl, prettyDate } from "@/lib/format";
import { textileSize, textileUrl } from "@/lib/textile";
import { useTrack } from "@/lib/track";

type Project = FunctionReturnType<typeof api.projects.mine>[number];

const STATUS: Record<string, { text: string; cls: string }> = {
  draft: { text: "Draft", cls: "" },
  paid: { text: "Live", cls: "ok" },
  suspended: { text: "Suspended", cls: "bad" },
};
const cloth = { backgroundImage: textileUrl("adire", "#5a5fd6", "#2b2fa8", 0.7), backgroundSize: textileSize("adire", 0.7) };

/** The one thing this celebration needs next. */
function nextStep(p: Project): { label: string; cta: string } {
  if (p.status === "suspended") return { label: "This site is suspended", cta: "Open" };
  if (p.status === "draft") return p.photos < 3 ? { label: `Add ${3 - p.photos} more photo${3 - p.photos === 1 ? "" : "s"}`, cta: "Continue" } : { label: "Ready to publish", cta: "Preview and pay" };
  if (!p.directed) return { label: "Your videos are waiting", cta: "Direct videos" };
  if (p.videos < 2) return { label: "Save your two videos", cta: "Save videos" };
  if (p.wishesWaiting > 0) return { label: `${p.wishesWaiting} wish${p.wishesWaiting === 1 ? "" : "es"} to approve`, cta: "Review" };
  return { label: "Everything is done", cta: "Manage" };
}

function when(p: Project): string {
  if (!p.eventDate) return "No date set";
  const d = daysUntil(p.eventDate);
  return d > 1 ? `In ${d} days` : d === 1 ? "Tomorrow" : d === 0 ? "Today" : "Done";
}

export default function Dashboard() {
  const me = useQuery(api.users.me);
  const projects = useQuery(api.projects.mine);
  const setProfile = useMutation(api.users.setProfile);
  const track = useTrack();
  const router = useRouter();
  const [name, setName] = useState("");
  // New accounts answer three quick questions before they see the dashboard.
  useEffect(() => { if (me && !me.onboarded) router.replace("/app/welcome"); }, [me?.onboarded, me?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (me) setName(me.name ?? ""); }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!me) return;
    try {
      if (window.sessionStorage.getItem("orikly_just_logged_in")) {
        window.sessionStorage.removeItem("orikly_just_logged_in");
        track("login_verified");
      }
    } catch {
      /* ignore */
    }
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = projects ?? [];
  const first = (me?.name ?? "").trim().split(" ")[0];
  const [hello, setHello] = useState("Welcome");
  useEffect(() => { const h = new Date().getHours(); setHello(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"); }, []);
  // The nearest celebration still ahead gets the spotlight.
  const upcoming = list.filter((p) => p.eventDate && daysUntil(p.eventDate) >= 0 && p.status !== "suspended").sort((a, b) => daysUntil(a.eventDate!) - daysUntil(b.eventDate!))[0];
  const credits = me?.credits ?? 0;
  const sum = (f: (p: Project) => number) => list.reduce((n, p) => n + f(p), 0);
  const stats = [
    { n: list.filter((p) => p.status === "paid").length, l: "Live websites", s: `${list.filter((p) => p.status === "draft").length} in draft` },
    { n: sum((p) => p.views), l: "Website views", s: "Across all your links" },
    { n: sum((p) => p.wishesWaiting), l: "Wishes to approve", s: `${sum((p) => p.wishes)} showing` },
    { n: credits, l: "Credits", s: credits ? "Never expire" : "A celebration uses 9" },
  ];

  return (
    <>
      <AppBar />
      <main className="page">
        <div className="dash-top">
          <div>
            <h1>{hello}{first ? <>, <em>{first}</em></> : null}</h1>
            <p className="muted">{list.length ? "Here is where everything stands." : "Let us make your first celebration."}</p>
          </div>
        </div>

        {upcoming ? (
          <Link href={`/app/${upcoming._id}`} className="spot">
            <div className="count"><b>{daysUntil(upcoming.eventDate!)}</b><span>{daysUntil(upcoming.eventDate!) === 1 ? "day to go" : "days to go"}</span></div>
            <div className="about"><span className="tagline">Your next celebration</span><b>{upcoming.names}</b><span>On {prettyDate(upcoming.eventDate!)}. Next: {nextStep(upcoming).label.toLowerCase()}.</span></div>
            <span className="btn light small">{nextStep(upcoming).cta}</span>
          </Link>
        ) : null}

        <div className="kpis">
          {stats.map((s) => (
            <div key={s.l}><span className="tagline muted">{s.l}</span><b>{projects === undefined ? "–" : s.n.toLocaleString()}</b><span className="muted small">{s.s}</span></div>
          ))}
        </div>

        <section className="dash-block">
          <div className="dash-head"><h2>Celebrations</h2><span className="muted small">{list.length ? `${list.length} in all` : ""}</span></div>
          {projects === undefined ? (
            <p className="muted">Loading…</p>
          ) : list.length === 0 ? (
            <div className="dash-empty">
              <b>No celebrations yet</b>
              <p className="muted">Add your photos and words, pick a look, and see your website come together. About ten minutes.</p>
              <Link href="/app/new" className="btn hot">Start a celebration</Link>
            </div>
          ) : (
            <div className="rows">
              <div className="rows-head"><span>Celebration</span><span>Status</span><span>The day</span><span>Views</span><span>Wishes</span><span>Videos</span><span>Next</span></div>
              {list.map((p) => {
                const st = STATUS[p.status] ?? STATUS.draft;
                const step = nextStep(p);
                return (
                  <Link key={p._id} href={`/app/${p._id}`} className="rowx">
                    <span className="who">
                      <i className="thumb-s" style={p.coverUrl ? { backgroundImage: `url(${p.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : cloth} />
                      <span><b>{p.names}</b><small>{p.status === "paid" ? siteUrl(p.slug).replace(/^https?:\/\//, "") : `${p.occasion}, ${p.photos} photo${p.photos === 1 ? "" : "s"}`}</small></span>
                    </span>
                    <span data-l="Status"><span className={`chip ${st.cls}`}>{st.text}</span></span>
                    <span data-l="The day">{when(p)}</span>
                    <span data-l="Views" className="num">{p.views.toLocaleString()}</span>
                    <span data-l="Wishes" className="num">{p.wishes}{p.wishesWaiting ? <em>+{p.wishesWaiting}</em> : null}</span>
                    <span data-l="Videos" className="num">{Math.min(p.videos, 2)}/2</span>
                    <span className="next"><small>{step.label}</small><span className="btn small">{step.cta}</span></span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </>
  );
}
