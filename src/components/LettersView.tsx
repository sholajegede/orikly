"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { fontsHref } from "@convex/lib/design";
import { LettersCanvas } from "@/components/site/LettersCanvas";
import { useTrack } from "@/lib/track";
import type { SiteData } from "@/components/SiteView";

/** The "Open when…" page. Like the website, a live celebration arrives pre-rendered and cached. */
export function LettersView({ slug, initial }: { slug: string; initial?: SiteData }) {
  const fresh = useQuery(api.projects.publicBySlug, initial ? "skip" : { slug });
  const data = initial ?? fresh;
  const track = useTrack();
  const preview = usePathname().startsWith("/app/preview");

  if (data === undefined) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }} className="muted">Loading…</div>;
  if (!data || !data.design || data.letters.length === 0) {
    return (
      <main className="wrap narrow" style={{ padding: "80px 16px", textAlign: "center" }}>
        <h1 className="display" style={{ fontSize: 56 }}>Nothing here yet</h1>
        <p className="muted">These letters are not ready, or the link is wrong.</p>
        <a className="btn" href={preview ? `/app/preview/${slug}` : `/s/${slug}`}>Back</a>
      </main>
    );
  }
  const url = new Map(data.photos.map((p) => [p.id, p.url]));
  return (
    <>
      <link rel="stylesheet" href={fontsHref(data.design)} precedence="default" />
      <LettersCanvas
        design={data.design}
        slug={slug}
        names={data.site.names}
        letters={data.letters.map((l) => ({ id: l.id, when: l.when, text: l.text, photoId: l.photo, photoUrl: (l.photo && url.get(l.photo)) || null, opensOn: l.opensOn }))}
        films={data.lettersFilms}
        homeHref={preview ? `/app/preview/${slug}` : `/s/${slug}`}
        banner={!data.lettersOn ? <div className="banner">Preview. Only you can see these letters until you publish them.</div> : null}
        onTrack={(name, props) => track(name, { slug, props })}
      />
    </>
  );
}
