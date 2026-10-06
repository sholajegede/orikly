import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "../globals.css";

export const metadata: Metadata = { title: "Orikly Admin", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f0f08" };

/** The admin app. It is served only on the admin subdomain and has its own sign-in. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;800&family=Instrument+Serif:ital@0;1&display=swap" />
        </head>
        <body className="admin-body">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
