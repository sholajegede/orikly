import type { Consent } from "./consent";

/**
 * Advertising and analytics tags. Nothing here loads until the visitor agrees.
 * Set the ids in .env.local: NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_TIKTOK_PIXEL_ID.
 */
const GA = process.env.NEXT_PUBLIC_GA_ID;
const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

type Fn = (...args: unknown[]) => void;
type W = Window & { dataLayer?: unknown[]; gtag?: Fn; fbq?: Fn & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: Fn; push?: Fn }; _fbq?: unknown; ttq?: Record<string, Fn> & unknown[]; TiktokAnalyticsObject?: string };

const on = { ga: false, meta: false, tiktok: false };
let current: Consent | null = null;

function script(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

// gtag.js only understands the real `arguments` object in the data layer, not an array.
function gtag(..._args: unknown[]) {
  const w = window as W;
  w.dataLayer = w.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
}

function loadGa() {
  if (on.ga || !GA) return;
  on.ga = true;
  script(`https://www.googletagmanager.com/gtag/js?id=${GA}`);
  gtag("js", new Date());
  gtag("config", GA, { anonymize_ip: true });
}

function loadMeta() {
  if (on.meta || !META) return;
  on.meta = true;
  const w = window as W;
  if (!w.fbq) {
    const fbq: W["fbq"] = function (...args: unknown[]) {
      if (fbq!.callMethod) fbq!.callMethod(...args);
      else fbq!.queue!.push(args);
    } as W["fbq"];
    fbq!.push = fbq as Fn;
    fbq!.loaded = true;
    fbq!.version = "2.0";
    fbq!.queue = [];
    w.fbq = fbq;
    w._fbq = fbq;
    script("https://connect.facebook.net/en_US/fbevents.js");
  }
  w.fbq!("consent", "grant");
  w.fbq!("init", META);
  w.fbq!("track", "PageView");
}

function loadTikTok() {
  if (on.tiktok || !TIKTOK) return;
  on.tiktok = true;
  const w = window as W;
  w.TiktokAnalyticsObject = "ttq";
  const ttq = (w.ttq = w.ttq ?? ([] as unknown as W["ttq"]))!;
  for (const m of ["page", "track", "identify", "grantConsent", "revokeConsent", "holdConsent"]) {
    ttq[m] = (...args: unknown[]) => { (ttq as unknown[]).push([m, ...args]); };
  }
  script(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${TIKTOK}&lib=ttq`);
  ttq.grantConsent();
  ttq.page();
}

/** Tell Google the default is "no" before anything else runs. Call once on page load. */
export function consentDefaults() {
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied", wait_for_update: 500 });
}

export function applyConsent(c: Consent) {
  current = c;
  gtag("consent", "update", {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.marketing ? "granted" : "denied",
    ad_user_data: c.marketing ? "granted" : "denied",
    ad_personalization: c.marketing ? "granted" : "denied",
  });
  if (c.analytics) loadGa();
  const w = window as W;
  if (c.marketing) {
    loadMeta();
    loadTikTok();
  } else {
    if (on.meta) w.fbq?.("consent", "revoke");
    if (on.tiktok) w.ttq?.revokeConsent?.();
  }
}

export function adPage(path: string) {
  if (!current) return;
  const w = window as W;
  if (current.analytics && on.ga) gtag("event", "page_view", { page_path: path });
  if (current.marketing) {
    if (on.meta) w.fbq?.("track", "PageView");
    if (on.tiktok) w.ttq?.page?.();
  }
}

export type AdEvent = "CompleteRegistration" | "ViewContent" | "InitiateCheckout" | "Purchase";
const GA_NAME: Record<AdEvent, string> = { CompleteRegistration: "sign_up", ViewContent: "view_item", InitiateCheckout: "begin_checkout", Purchase: "purchase" };
const TIKTOK_NAME: Record<AdEvent, string> = { CompleteRegistration: "CompleteRegistration", ViewContent: "ViewContent", InitiateCheckout: "InitiateCheckout", Purchase: "CompletePayment" };

/** A conversion the ad platforms should know about. Silently does nothing without consent. */
export function adEvent(name: AdEvent, value?: { naira?: number; id?: string }) {
  if (!current) return;
  const w = window as W;
  const money = value?.naira ? { value: value.naira, currency: "NGN" } : {};
  if (current.analytics && on.ga) gtag("event", GA_NAME[name], { ...money, transaction_id: value?.id });
  if (current.marketing) {
    if (on.meta) w.fbq?.("track", name, money, value?.id ? { eventID: `${name}-${value.id}` } : undefined);
    if (on.tiktok) w.ttq?.track?.(TIKTOK_NAME[name], money);
  }
}
