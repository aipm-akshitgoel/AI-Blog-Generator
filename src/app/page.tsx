import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { HomepageCTA } from "@/components/HomepageCTA";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { userId } = await auth();

  // If the user lands here and is already logged in, take them to the app
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-neutral-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-900/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-900/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>

      <div className="relative z-10 max-w-3xl border border-neutral-800/50 bg-neutral-900/40 p-8 md:p-16 rounded-3xl backdrop-blur-xl shadow-2xl">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
          Bloggie AI
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 font-bold">
            Intelligent Blog Generation Agent
          </span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-400 mb-10 leading-relaxed max-w-2xl mx-auto">
          Pick a topic. 9 AI agents do the rest — write, optimize, and publish.
        </p>

        <HomepageCTA />

        <div className="mt-12 flex items-center justify-center gap-6 text-sm text-neutral-500 font-medium">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            9 AI Agents
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            3-Step Publish
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500/70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
            Real-Time Analytics
          </div>
        </div>
      </div>
    </main>
  );
}
