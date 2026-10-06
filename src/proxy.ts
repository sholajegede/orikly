import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLogin = createRouteMatcher(["/login"]);
const isProtected = createRouteMatcher(["/app(.*)"]);
const isAdminPath = createRouteMatcher(["/admin(.*)"]);

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").toLowerCase();
const RESERVED = new Set(["www", "app", "api", "admin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const path = request.nextUrl.pathname;

  // The admin app lives on its own subdomain (admin.orikly.ng, admin.localhost) with its own session.
  if (host.startsWith("admin.")) {
    if (path.startsWith("/api/")) return;
    const authed = await convexAuth.isAuthenticated();
    if (path === "/login") {
      if (authed) return nextjsMiddlewareRedirect(request, "/");
    } else if (!authed) {
      return nextjsMiddlewareRedirect(request, "/login");
    }
    const url = request.nextUrl.clone();
    url.pathname = path === "/" ? "/admin" : `/admin${path}`;
    return NextResponse.rewrite(url);
  }

  // The admin app does not exist on any other host.
  if (isAdminPath(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/not-here";
    return NextResponse.rewrite(url);
  }

  // Customer sites: tolu-and-bisi.orikly.ng/anything  ->  /s/tolu-and-bisi
  if (ROOT && host.endsWith("." + ROOT)) {
    const sub = host.slice(0, -(ROOT.length + 1));
    if (sub && !sub.includes(".") && !RESERVED.has(sub)) {
      if (path.startsWith("/s/")) return;
      const url = request.nextUrl.clone();
      url.pathname = `/s/${sub}`;
      return NextResponse.rewrite(url);
    }
  }

  if (isLogin(request) && (await convexAuth.isAuthenticated())) {
    const next = request.nextUrl.searchParams.get("next");
    return nextjsMiddlewareRedirect(request, next && next.startsWith("/app") ? next : "/app");
  }
  if (isProtected(request) && !(await convexAuth.isAuthenticated())) {
    const next = encodeURIComponent(path);
    return nextjsMiddlewareRedirect(request, `/login?next=${next}`);
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
