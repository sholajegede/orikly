import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PublicConvexProvider } from "@/components/PublicConvexProvider";
import "../globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = { metadataBase: new URL(siteUrl), title: { default: "Celebration", template: "%s | Orikly" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3eee4" };

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;800&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body>
        <PublicConvexProvider>{children}</PublicConvexProvider>
      </body>
    </html>
  );
}
