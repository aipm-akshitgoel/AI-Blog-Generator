# My App

Next.js 15 + TypeScript + Tailwind. Set up for Vercel, Supabase, Gemini, and Clerk.

## Run locally

1. **Install Node.js** (if needed): [nodejs.org](https://nodejs.org) or `nvm install 20`
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Supabase**: `.env.local` is already set for the learning project. Create the sample table once: open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor** → paste and run the contents of `supabase/001_create_tasks.sql`.
4. **Start dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Use “Test Supabase API” to see tasks from the database.

## Project layout

- `src/app/` — App Router pages and layout
- `src/app/api/` — API routes (e.g. `/api/health`)
- `.env.local` — Local env vars (create from `.env.example`)

## Deploy

Push to GitHub and import the repo in [Vercel](https://vercel.com). Add the same env vars in the Vercel project settings.
