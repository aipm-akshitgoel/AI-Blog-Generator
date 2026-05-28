# Bloggie AI

AI-powered SEO blog pipeline: keyword strategy, structured drafts (H1/H2/H3), optimization, internal linking, meta/schema, CTAs, images, and publish to your domain.

**Stack:** Next.js 15 · TypeScript · Tailwind · Clerk · Supabase · Azure OpenAI · Gemini

**Production:** [bloggieai.com](https://bloggieai.com)

## For AI agents

Start with **[AGENTS.md](./AGENTS.md)** — pipeline map, key files, env vars, SEO density rules, interlinking behavior.

Recent session context: **[docs/HANDOFF.md](./docs/HANDOFF.md)**

## Run locally

1. **Node 20+** — [nodejs.org](https://nodejs.org) or `nvm install 20`
2. **Install**
   ```bash
   npm install
   ```
3. **Environment** — copy `.env.example` to `.env.local` and fill in Clerk, Supabase, and Azure OpenAI keys (see comments in `.env.example`).
4. **Supabase** — in [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor, run migrations in `supabase/*.sql` in order (at minimum `002`–`004`, `009`, `010_enable_rls.sql`).
5. **Dev server**
   ```bash
   npm run dev
   ```
   - App home: [http://localhost:3000](http://localhost:3000)
   - Blog writer: [http://localhost:3000/setup?mode=blog](http://localhost:3000/setup?mode=blog)

## Main routes

| Route | Purpose |
|-------|---------|
| `/setup?mode=blog` | Blog creation pipeline |
| `/dashboard` | Your blogs |
| `/blog/[slug]` | Published post |
| `/ai-faq` | FAQ admin SPA (separate product surface) |

## Project layout

```
src/app/           App Router pages & API routes
src/components/    Agent UIs (Content, Optimize, Meta, …)
src/lib/           Shared logic (interlinking, seoAnalyzer, DB helpers)
supabase/          SQL migrations
docs/              Deploy notes (e.g. ai-faq)
AGENTS.md          Agent onboarding doc
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run sync:ai-faq` | Build & copy fusion-parsec into `public/ai-faq/` |

## Deploy (Vercel)

1. Push to GitHub; import repo in [Vercel](https://vercel.com).
2. Add environment variables from `.env.example` (Production + Preview).
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for server API routes.
4. Run any new `supabase/*.sql` migrations in Supabase before relying on schema changes.

See **[docs/ai-faq-deploy.md](./docs/ai-faq-deploy.md)** for the `/ai-faq` static app sync.

## License

Private — All rights reserved.
