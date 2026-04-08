# AI FAQ app at `bloggieai.com/ai-faq`

The FAQ UI is the **fusion-parsec** Vite app, built with `base: '/ai-faq/'` and copied into this repo as static files.

## One-time / before each deploy

From the **Cursor / my-app** repo root:

```bash
npm run sync:ai-faq
```

This will:

1. `npm install` + `npm run build` in `fusion-parsec` (default: `~/.gemini/antigravity/playground/fusion-parsec`, override with `FUSION_PARSEC=/path`).
2. Copy `dist/` → `public/ai-faq/`.

Then build and deploy the Next site as usual:

```bash
npm run build
```

## URLs

- `https://bloggieai.com/ai-faq` → SPA (rewrite to `index.html`; no trailing slash)
- `https://bloggieai.com/ai-faq/` → Next.js redirects to `/ai-faq` (default `trailingSlash: false`)

**Local:** run `npm run dev` in this repo, then open `http://localhost:3000/ai-faq` (avoid `/ai-faq/` ↔ `/ai-faq` redirect chains from mixing custom redirects with Next defaults).

## CI (Vercel / etc.)

Either:

- **Commit** `public/ai-faq/` after running `sync:ai-faq` locally, or  
- Add a build step that clones/copies fusion-parsec and runs the same sync before `next build`.

Set `VITE_GEMINI_API_KEY` (or your env name) in the host for the client bundle if Gemini is used in production.

## FAQ API proxy (Next)

`/api/faq/page` and `/api/faq/page/bulk` forward to the backend with a **12s server timeout** so the route does not hang.

| Variable | Purpose |
|----------|---------|
| `FAQ_UPSTREAM_BASE` | Optional. Base URL (no trailing slash). Default: `https://iitkgp-portal-server.upgrad.com` |
| `FAQ_UPSTREAM_AUTHORIZATION` | Optional. Server-only Bearer (or full `Authorization` value) sent to the upstream if the browser does not send one. Example: `Bearer your-token` |
| `PROD_PUSH_PASSWORD` | Required for prod push. The fixed password continues to work as before. |
| `PROD_PUSH_OTP_SECRET` | Optional. Secret used to sign 10-minute OTPs. Falls back to `PROD_PUSH_PASSWORD` if omitted. |

If the default host returns **502** or **504**, point `FAQ_UPSTREAM_BASE` at the FAQ service your team actually runs (VPN/staging/production as appropriate).

### 10-minute OTPs

To generate a temporary prod-push password that works for 10 minutes from the moment it is created:

```bash
npm run otp:prod-push
```

You can paste that generated token into the same password field used for the fixed password.

## Local dev quirks

- Open **`http://127.0.0.1:3000/ai-faq`** or **`http://localhost:3000/ai-faq`**.
- If the **connection** to `/api/faq/page` fails (timeout, network), the SPA may use **demo FAQ pages** on localhost and show a yellow banner. **HTTP errors from a live API** (e.g. 502) are **not** replaced with demo data—you should fix the upstream URL or auth.
- To **always** use demo data when building fusion-parsec, set `VITE_FAQ_DEMO=1` in fusion-parsec’s env, then run `npm run sync:ai-faq` again.
