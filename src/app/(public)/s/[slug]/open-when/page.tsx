import type { Metadata } from "next";
import { LettersView } from "@/components/LettersView";
import { getSite } from "@/lib/site-data";

export const revalidate = 30;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getSite(slug).catch(() => null);
  const title = d ? `Open when… for ${d.site.names}` : "Open when…";
  const description = d?.letters.length ? `${d.letters.length} letters for the days ahead. Open the one you need.` : "Letters for the days ahead.";
  return { robots: { index: false, follow: false }, title, description, openGraph: { title, description, type: "website", siteName: "Orikly" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function LettersPage({ params }: Props) {
  const { slug } = await params;
  const initial = (await getSite(slug).catch(() => null)) ?? undefined;
  return <LettersView slug={slug} initial={initial} />;
}
