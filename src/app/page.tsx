import GeminiChat from "@/components/GeminiChat";

async function fetchTasks() {
  const res = await fetch("http://localhost:3000/api/supabase-example", {
    cache: "no-store",
  });
  if (!res.ok) {
    return { error: "Supabase not yet configured or API error" };
  }
  return res.json();
}

export default async function Home() {
  const result = await fetchTasks();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to your app
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-md text-center">
          Next.js + TypeScript + Tailwind. Ready to plug in Supabase, Clerk,
          and Gemini.
        </p>
      </div>

      <div className="flex gap-4">
        <a
          href="/api/health"
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
        >
          Check API
        </a>
        <a
          href="/api/supabase-example"
          className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-100 hover:bg-neutral-900"
        >
          Test Supabase API
        </a>
      </div>

      <GeminiChat />

      <div className="mt-6 max-w-lg w-full text-left text-sm text-neutral-400 border border-neutral-800 rounded-xl p-4">
        <div className="font-semibold mb-2">Supabase sample data</div>
        <pre className="whitespace-pre-wrap break-all">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </main>
  );
}
