import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { SiteView, type SiteData } from "@/components/SiteView";

export const revalidate = 30;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

// One backend read per site every 30 seconds, however many guests open the link.
const getSite = unstable_cache(
  async (slug: string): Promise<SiteData | null> => {
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    return await client.query(api.projects.publicBySlug, { slug });
  },
  ["public-site"],
  { revalidate: 30 },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const base: Metadata = { robots: { index: false, follow: false } };
  try {
    const d = await getSite(slug);
    if (!d) return { ...base, title: "Celebration" };
    const title = d.site.names;
    const description = d.design?.hero.tagline ?? d.site.headline ?? "Come and celebrate with us.";
    // The share picture comes from opengraph-image.tsx next to this file.
    return { ...base, title, description, openGraph: { title, description, type: "website", siteName: "Orikly" }, twitter: { card: "summary_large_image", title, description } };
  } catch {
    return { ...base, title: "Celebration" };
  }
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  let initial: SiteData | undefined;
  try {
    initial = (await getSite(slug)) ?? undefined;
  } catch {
    initial = undefined;
  }
  return <SiteView slug={slug} initial={initial} />;
}
