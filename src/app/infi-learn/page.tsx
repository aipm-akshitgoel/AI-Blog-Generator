import type { Metadata } from "next";
import InfiLearnDashboardClient from "@/components/infi-learn/InfiLearnDashboardClient";

export const metadata: Metadata = {
  title: "Infinity Learn | Mentor Intelligence Dashboard",
  robots: { index: false, follow: false },
};

export default function InfiLearnPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-rose-50 p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-700 sm:text-4xl">
              Welcome Mentor, <span className="text-indigo-700">Varsha</span>!
            </h1>
          </div>
        </section>

        <InfiLearnDashboardClient />

      </div>
    </main>
  );
}
