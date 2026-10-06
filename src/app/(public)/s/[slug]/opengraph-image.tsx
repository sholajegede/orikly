import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { OCCASIONS } from "@convex/lib/constants";
import { onColor } from "@convex/lib/design";
import { prettyDate } from "@/lib/format";

export const alt = "A celebration made with Orikly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

const WEIGHT: Record<string, number> = { "Bricolage Grotesque": 700, Syne: 700, Fraunces: 500, "Playfair Display": 500, "Cormorant Garamond": 600 };

/** Fetch only the letters we draw, as a font file the image renderer can read. */
async function loadFont(family: string, weight: number, italic: boolean, text: string): Promise<ArrayBuffer | null> {
  try {
    const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${axis}&text=${encodeURIComponent(text)}`).then((r) => (r.ok ? r.text() : ""));
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The picture that shows when the link is shared on WhatsApp, Facebook, LinkedIn or X. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string).query(api.projects.publicBySlug, { slug }).catch(() => null);

  const c = d?.design?.colors ?? { bg: "#f3eee4", ink: "#1f0f08", accent: "#e4572e", card: "#fffdf8", muted: "#6e5f55" };
  const names = d?.site.names ?? "A celebration";
  const occasion = OCCASIONS.find((o) => o.id === d?.site.occasion)?.label ?? "Celebration";
  const kicker = [occasion, d?.site.eventDate ? prettyDate(d.site.eventDate) : null].filter(Boolean).join("  ·  ").toUpperCase();
  const tagline = d?.design?.hero.tagline ?? d?.site.headline ?? "Come and celebrate with us.";
  const hero = d?.design?.hero.photo ? d.photos.find((p) => p.id === d.design!.hero.photo)?.url : undefined;
  const photo = hero ?? d?.coverUrl ?? null;
  const family = d?.design?.fonts.display ?? "Instrument Serif";
  const italic = d?.design ? d.design.namesStyle === "italic" && family !== "Anton" && family !== "Abril Fatface" && family !== "Syne" && family !== "Bricolage Grotesque" : true;
  const shown = d?.design?.namesStyle === "upper" ? names.toUpperCase() : names;
  const weight = WEIGHT[family] ?? 400;
  const line = tagline.length > 90 ? `${tagline.slice(0, 88)}…` : tagline;
  const [font, body] = await Promise.all([loadFont(family, weight, italic, shown), loadFont("DM Sans", 500, false, `${kicker}${line}Open the celebration made with Orikly·…`)]);
  const big = shown.length > 22 ? 78 : shown.length > 14 ? 96 : 122;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: c.bg, color: c.ink, fontFamily: body ? "Body" : undefined }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 56px 56px 72px" }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: c.accent }}>{kicker}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: font ? "Display" : undefined, fontStyle: italic && font ? "italic" : "normal", fontSize: big, lineHeight: 0.95, letterSpacing: -2 }}>{shown}</div>
            <div style={{ display: "flex", fontSize: 30, lineHeight: 1.3, marginTop: 26, color: c.muted, maxWidth: 520 }}>{line}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 22 }}>
            <div style={{ display: "flex", background: c.accent, color: onColor(c.accent), padding: "10px 22px", borderRadius: 999 }}>Open the celebration</div>
            <div style={{ display: "flex", marginLeft: 20, color: c.muted }}>made with Orikly</div>
          </div>
        </div>
        {photo ? (
          <div style={{ display: "flex", width: 470, padding: "44px 56px 44px 0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "220px 220px 18px 18px", boxShadow: `14px 14px 0 ${c.accent}` }} />
          </div>
        ) : null}
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(body ? [{ name: "Body", data: body, weight: 500 as const, style: "normal" as const }] : []),
        ...(font ? [{ name: "Display", data: font, weight: weight as 400 | 500 | 600 | 700, style: italic ? ("italic" as const) : ("normal" as const) }] : []),
      ],
    },
  );
}
