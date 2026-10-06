import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Consent } from "@/components/Consent";
import "../globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Orikly: Praise them properly", template: "%s | Orikly" },
  description:
    "A website and two videos for your wedding, birthday or anniversary. Upload your photos and words on your phone. ₦20,000, paid once.",
  openGraph: {
    title: "Orikly: Praise them properly",
    description: "A website and two videos for your wedding, birthday or anniversary. ₦20,000, paid once.",
    type: "website",
    siteName: "Orikly",
  },
  twitter: { card: "summary_large_image", title: "Orikly: Praise them properly" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3eee4",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
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
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Consent />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
