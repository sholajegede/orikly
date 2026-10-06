"use client";

import { use } from "react";
import { SiteView } from "@/components/SiteView";

/** Staff preview of any celebration, live or not. */
export default function AdminPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <SiteView slug={slug} />;
}
