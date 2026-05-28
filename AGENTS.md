# AGENTS.md — Bloggie AI

Guide for AI coding agents working in this repo. Read this first; use `docs/HANDOFF.md` for recent session context.

## What this is

**Bloggie AI** (`bloggieai.com`) is a Next.js 15 app that runs an SEO blog pipeline: business profile → keyword strategy → topic brief → draft → optimize → meta/schema/CTA/images → publish. Auth via **Clerk**; data via **Supabase** (server uses `service_role`); generation via **Azure OpenAI** (primary for content/optimize/CTA) and **Gemini** (images, LinkedIn, some FAQ).

## Pipeline (main product)

Entry: `/setup?mode=blog` (`src/app/setup/page.tsx`).

```
BusinessContextSetup → StrategyAgent → TopicSelector → TopicBriefPanel
  → ContentAgent → OptimizationAgent → MetaSeo → Schema → CTA → Image → Publishing
```

| Step | Component | API route |
|------|-----------|-----------|
| Strategy | `StrategyAgent.tsx` | `/api/strategy-agent`, `/api/strategy-session` |
| Brief | `TopicBriefPanel.tsx` | (client state → passed to content-agent) |
| Draft | `ContentAgent.tsx` | `/api/content-agent` |
| Optimize | `OptimizationAgentUI.tsx` | `/api/optimize-content` |
| Meta | `MetaSeoAgentUI.tsx` | `/api/meta-seo` |
| Schema | `SchemaAgentUI.tsx` | `/api/schema-gen` |
| CTA | `CtaAgentUI.tsx` | `/api/cta-agent` |
| Images | `ImageAgentUI.tsx` | `/api/image-agent` |
| Publish | `PublishingAgentUI.tsx` | `/api/publish-agent`, `/api/blog` |

Published posts: `/blog/[slug]`, dashboard `/dashboard`.

## Key types & config

| File | Purpose |
|------|---------|
| `src/lib/types/businessContext.ts` | Profile: domain, services, `internalLinks` |
| `src/lib/types/strategy.ts` | Keyword strategy, topic directory, H2 titles |
| `src/lib/types/topicBrief.ts` | `TopicBrief`: notes, files, `contentConstraints`, `interlinkingRules` |
| `src/lib/types/contentSpec.ts` | SEO structure, density defaults, interlinking prompts |
| `src/lib/types/content.ts` | `BlogPost` |
| `src/lib/types/optimization.ts` | `OptimizedContent`, `SeoScores` |

### SEO structure (`ContentConstraints`)

- Every article: **H1 + H2 + H3** (`h3PerH2`, default **2** `###` per `##`).
- **Required** when structure is set: `h1KeywordDensityPercent` (default **1.5**), `h2KeywordDensityPercent` (default **1.0**).
- **Optional**: `h3KeywordDensityPercent`, `domainKeywordDensityPercent`.
- Prompt builder: `buildContentConstraintsPrompt()` in `contentSpec.ts`.
- Normalizer applies defaults: `normalizeContentConstraints()`, `applyContentConstraintDefaults()`.

### Keyword density counting

Implemented in `src/lib/seoAnalyzer.ts` (`keywordDensityPercent`, `buildKeywordDensityRows`). Rules (also in `KEYWORD_DENSITY_COUNTING_RULES` in `contentSpec.ts`):

1. Plain text: strip `#` heading lines; keep link anchor text.
2. Case-insensitive phrase match; flexible whitespace.
3. Numerator: each match adds the keyword’s word count.
4. Denominator: words in the scoped span.
5. Formula: `(keyword-words ÷ span-words) × 100`, one decimal.

| Target | Scope |
|--------|--------|
| H1 | Intro before first `##` (excl. `#` H1 line) |
| H2 | Each `##` section; `###` lines excluded from H2 count |
| H3 | Each `###` block (optional target) |
| Domain | Full body, FAQ block excluded |

Optimizer UI: **Heading tags** = heading-phrase reinforcement in section (`headingDensityPercent`). **Keyword density** = primary keyword vs targets (`buildKeywordDensityRows`).

### Internal linking

`src/lib/interlinking.ts` — post-optimize enforcement:

- Only **approved** same-site URLs (`deriveApprovedLinks`, `discover-domain-links`).
- **Generic phrases** (“degree programs”, etc.) → homepage `/` or shallow hubs only — never deep program URLs without paragraph context.
- `applyInterlinkingToContent()` used in `optimizeContentClient.ts` and optimize API.
- Default rules: `DEFAULT_INTERLINKING_RULES` in `topicBrief.ts` (min 4, max 6 links).

### FAQ dedupe

When structured `faqs` exist on the post, strip `## FAQs` from markdown: `stripFaqFromMarkdownWhenStructured()` in `contentWordCount.ts` (used in optimize, publish, blog page, editor).

## Directory map

```
src/app/
  setup/page.tsx          # Main blog pipeline
  dashboard/              # Blog list & edit
  blog/[slug]/            # Public post
  api/                    # All server routes (see glob)
  ai-faq/                 # Static SPA (fusion-parsec) — see docs/ai-faq-deploy.md
src/components/           # Agent UIs, TopicBriefPanel, editors
src/lib/
  interlinking.ts         # Link enforce/strip
  seoAnalyzer.ts          # SEO metrics & density tables
  optimizeContentClient.ts
  blogDb.ts, strategyDb.ts, businessContextDb.ts
  azureOpenAI.ts          # Azure chat completions
  supabaseServerClient.ts # Server Supabase (service_role)
supabase/*.sql            # Migrations — run in order in SQL Editor
```

## Environment variables

Copy `.env.example` → `.env.local`. Critical for blog pipeline:

| Variable | Use |
|----------|-----|
| `NEXT_PUBLIC_CLERK_*` | Auth; custom Google OAuth → see `.env.example` comments |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (limited after RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** for API routes writing blogs/strategy/feedback |
| `AZURE_OPENAI_*` | Content, optimize, CTA agents |
| `GEMINI_API_KEY` | Images, LinkedIn |

After pull: run `supabase/*.sql` in Supabase SQL Editor, especially `009_*`, `010_enable_rls.sql`.

## Supabase & security

- RLS enabled on public tables (`010_enable_rls.sql`); no anon policies.
- **All DB writes from API routes** should use `supabaseServer` (`src/lib/supabaseServerClient.ts`) with `SUPABASE_SERVICE_ROLE_KEY`.
- Do not expose service role to the client.

## AI agent conventions

1. **Minimize scope** — match existing patterns; don’t refactor unrelated code.
2. **Prompts live in API routes** — `content-agent`, `optimize-content` import `buildContentConstraintsPrompt`, `buildInterlinkingRulesPrompt`.
3. **JSON from models** — use `parseModelJson` / `jsonrepair`; escape rules in system prompts.
4. **Timeouts** — optimize route is long (`OPTIMIZE_SERVER_MAX_DURATION_SEC` = 300); client has matching timeouts in `optimizeContentClient.ts`.
5. **HelpTip** — uses portal + `side="bottom"` to avoid clipping (`HelpTip.tsx`).
6. **Commits** — only when the user asks.

## Common tasks

| Task | Where to look |
|------|----------------|
| Change SEO brief fields | `TopicBriefPanel.tsx`, `contentSpec.ts` |
| Change optimizer SEO panel | `OptimizationAgentUI.tsx`, `seoAnalyzer.ts` |
| Fix bad internal links | `interlinking.ts`, re-run optimize on post |
| Change writer structure rules | `content-agent/route.ts`, `buildContentConstraintsPrompt` |
| Clerk OAuth redirect issues | `clerkAuth.ts`, sign-in/up pages, `.env.example` |
| Deploy AI FAQ static app | `npm run sync:ai-faq`, `docs/ai-faq-deploy.md` |

## Other surfaces (don’t confuse with blog pipeline)

- `/test`, `/test-dashboard` — dev mirrors of setup flow
- `/ai-faq` — separate FAQ admin SPA (upstream proxies in `api/faq/*`)
- `/linkedin` — LinkedIn agent
- `public/yd-online-mba-mirror/` — optional mirror assets

## Deploy

- **Vercel**, branch `main`, auto-deploy.
- Set all production env vars in Vercel (same as `.env.example`).
- Run new SQL migrations manually in Supabase before relying on new columns/tables.

## Tests

No comprehensive test suite. Verify with `npm run build` and manual flow on `/setup?mode=blog`.
