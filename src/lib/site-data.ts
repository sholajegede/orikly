import { unstable_cache } from "next/cache";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";

export type PublicSite = NonNullable<FunctionReturnType<typeof api.projects.publicBySlug>>;

/** One backend read per celebration every 30 seconds, however many guests open its pages. */
export const getSite = unstable_cache(
  async (slug: string): Promise<PublicSite | null> => {
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    return await client.query(api.projects.publicBySlug, { slug });
  },
  ["public-site"],
  { revalidate: 30 },
);
