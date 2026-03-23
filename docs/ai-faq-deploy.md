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

- `https://bloggieai.com/ai-faq` → redirects to `/ai-faq/`
- `https://bloggieai.com/ai-faq/` → SPA

## CI (Vercel / etc.)

Either:

- **Commit** `public/ai-faq/` after running `sync:ai-faq` locally, or  
- Add a build step that clones/copies fusion-parsec and runs the same sync before `next build`.

Set `VITE_GEMINI_API_KEY` (or your env name) in the host for the client bundle if Gemini is used in production.
