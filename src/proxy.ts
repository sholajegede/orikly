import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLogin = createRouteMatcher(["/login"]);
const isProtected = createRouteMatcher(["/app(.*)", "/admin(.*)"]);

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").toLowerCase();
const RESERVED = new Set(["www", "app", "api", "admin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // Customer sites: tolu-and-bisi.orikly.ng/anything  ->  /s/tolu-and-bisi
  if (ROOT) {
    const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
    if (host.endsWith("." + ROOT)) {
      const sub = host.slice(0, -(ROOT.length + 1));
      if (sub && !sub.includes(".") && !RESERVED.has(sub)) {
        const url = request.nextUrl.clone();
        url.pathname = `/s/${sub}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  if (isLogin(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/app");
  }
  if (isProtected(request) && !(await convexAuth.isAuthenticated())) {
    const next = encodeURIComponent(request.nextUrl.pathname);
    return nextjsMiddlewareRedirect(request, `/login?next=${next}`);
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
