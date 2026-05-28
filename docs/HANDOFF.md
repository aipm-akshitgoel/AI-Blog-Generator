# Session handoff — Bloggie AI

Paste this into a new chat when continuing work. For stable project docs, see [AGENTS.md](../AGENTS.md) and [README.md](../README.md).

**Last updated:** May 2026

## Project

Bloggie AI — Next.js 15 + TypeScript + Tailwind. Pipeline: strategy → brief → content → optimize → meta → schema → CTA → images → publish. **Vercel** (`main`), **Supabase** + **Clerk**, **Azure OpenAI** (content/optimize/CTA), **Gemini** (images).

## Recently shipped (verify deployed on prod)

| Area | What | Key files |
|------|------|-----------|
| HelpTip | Portal tooltip, no clipping | `HelpTip.tsx`, `OptimizationAgentUI.tsx` |
| Pagination | 4 topics/page in directory | `TopicSelector.tsx`, `ContentDirectoryList.tsx` |
| Clerk | OAuth paths / custom Google notes | `clerkAuth.ts`, `.env.example` |
| CTA agent | Domain/topic context, no localStorage bleed | `api/cta-agent/route.ts`, `CtaAgentUI.tsx` |
| FAQ dedupe | No duplicate FAQ in body + accordion | `contentWordCount.ts`, blog page, optimize/publish |
| Supabase RLS | `010_enable_rls.sql`; server uses `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServerClient.ts`, feedback routes |
| Interlinking | Generic anchors → homepage, not deep program URLs | `interlinking.ts` |
| SEO density | H1/H2 required defaults; H3/domain optional; analyzer table | `contentSpec.ts`, `seoAnalyzer.ts`, `TopicBriefPanel.tsx` |

## SEO structure & density (current behavior)

- **H3 per H2:** default 2 (`###` under each `##`).
- **Required densities:** H1 intro **1.5%**, each H2 section **1.0%** (for `h1PrimaryKeyword`).
- **Optional:** H3 per-block density, domain keyword full-body density.
- **Counting:** `(keyword-words ÷ span-words) × 100`; case-insensitive phrase match; FAQ excluded for domain scope; H2 excludes `###` lines.

Strategy topics with `h2Titles` auto-get constraints in `setup/page.tsx` (`handleTopicSelect`).

## Open follow-ups

1. Confirm **prod deploy** includes interlinking + SEO density commits.
2. **Re-optimize** Yourdegree posts that still have bad links (e.g. “degree programs” → deep MBA finance URL).
3. Check **git status** — ensure `OptimizationAgentUI.tsx` and related files are committed.
4. Optional: add automated tests for `keywordDensityPercent` / `interlinking` edge cases.

## Env checklist (Vercel production)

- `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`
- `GEMINI_API_KEY` (if using images)

## Quick commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # verify before deploy
npm run sync:ai-faq  # only if changing /ai-faq SPA
```

Supabase: run new files in `supabase/*.sql` via SQL Editor after pull.
