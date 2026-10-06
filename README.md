# Orikly

Orikly makes a website and two videos for weddings, birthdays and anniversaries. A customer signs in with their email, uploads photos and words from their phone, picks a style, and gets a link like `tolu-and-bisi.orikly.ng`. The price is ₦20,000, paid once.

## Stack

- Next.js (App Router) for the landing page, builder, customer sites and admin
- Convex for the database, file storage and Convex Auth (email code login)
- Resend for the login emails

## Run it locally

```bash
npm install
npx convex dev          # log in, create the project, writes .env.local
npx @convex-dev/auth    # sets SITE_URL and the signing keys on your Convex deployment
npm run dev
```

Set the Convex environment variables below with `npx convex env set NAME value`. For local testing without an email provider, set `AUTH_DEV_LOG_CODES=true` and read the login code in the `npx convex dev` output. Never set it in production.

| Variable | Where | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Written by `npx convex dev` |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` | Public URL of the main site, no trailing slash |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `.env.local` | Domain for customer sites, for example `orikly.ng` |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | `.env.local` | Support number, digits only with country code |
| `NEXT_PUBLIC_LANDING_VIDEO_URL` | `.env.local` | Optional landing page video |
| `AUTH_RESEND_KEY` | Convex | Resend API key |
| `AUTH_EMAIL_FROM` | Convex | Sender, for example `Orikly <login@orikly.ng>`. The domain must be verified in Resend. |
| `ADMIN_EMAILS` | Convex | Comma-separated emails that can open `/admin` |
| `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME` | Convex | Shown on the bank transfer step |

## How customer sites are served

Each celebration lives at `/s/<slug>`. When `NEXT_PUBLIC_ROOT_DOMAIN` is set, the middleware rewrites `<slug>.<root domain>` to that route, so one deployment serves every customer. To try it locally, set the root domain to `localhost` and open `http://<slug>.localhost:3000`.

## Admin

Open `/admin` with an email listed in `ADMIN_EMAILS`. It shows the signup funnel, every project, and a page per customer. From Projects you can confirm a bank transfer, suspend a site, and upload the finished videos for a customer.

## Layout

```
convex/         schema, auth, and backend functions
src/app/        pages: landing, login, dashboard, builder, public site, admin
src/components/ builder steps, site view, shared pieces
src/proxy.ts    auth gate, admin subdomain and customer subdomain rewrite
```

`convex/_generated` is replaced by the real generated files the first time you run `npx convex dev`.
