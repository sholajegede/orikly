import { textileSize, textileUrl, type Textile } from "@/lib/textile";

type Item = { slug: string; names: string; occasion: string; palette: string; coverUrl: string | null };
const CLOTHS: [Textile, string, string][] = [["adire", "#5a5fd6", "#2b2fa8"], ["asooke", "#e9b13c", "#7a3d0c"], ["ankara", "#f3d9b0", "#e4572e"], ["kente", "#e9b13c", "#1f7a55"]];
const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export function WallGrid({ items }: { items: Item[] }) {
  return (
    <div className="wall-grid">
      {items.map((it, i) => {
        const [kind, fg, bg] = CLOTHS[i % CLOTHS.length];
        return (
          <a key={it.slug} className="wall-card" href={root ? `https://${it.slug}.${root}` : `/s/${it.slug}`}>
            <div className="pic" style={it.coverUrl ? undefined : { backgroundImage: textileUrl(kind, fg, bg, 1.3), backgroundSize: textileSize(kind, 1.3) }}>
              {it.coverUrl ? <img src={it.coverUrl} alt="" loading="lazy" /> : null}
            </div>
            <div><span>{it.occasion}</span><br /><b>{it.names}</b></div>
          </a>
        );
      })}
    </div>
  );
}
