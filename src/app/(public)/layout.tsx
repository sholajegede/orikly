import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PublicConvexProvider } from "@/components/PublicConvexProvider";
import "../globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = { metadataBase: new URL(siteUrl), title: { default: "Celebration", template: "%s | Orikly" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#14163b" };

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=DM+Sans:wght@400;500;600;800&family=Figtree:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <PublicConvexProvider>{children}</PublicConvexProvider>
      </body>
    </html>
  );
}
