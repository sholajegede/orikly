import { unstable_cache } from "next/cache";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

/** Celebrations whose owners chose to show them. Cached for a minute so the landing page stays fast. */
export const getWall = unstable_cache(
  async (limit: number) => {
    try {
      return await new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string).query(api.projects.wall, { limit });
    } catch {
      return [];
    }
  },
  ["wall"],
  { revalidate: 60 },
);
