import { BusinessContextSetup } from "@/components/BusinessContextSetup";
import type { BusinessContext } from "@/lib/types/businessContext";
import Link from "next/link";

export const metadata = {
  title: "Business setup | AI Blog Generator",
  description: "Set up your business context for blog generation",
};

export default function SetupPage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-neutral-400 hover:text-neutral-100"
        >
          ← Back
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-neutral-100">
          Business context
        </h1>
        <p className="mb-8 text-neutral-400">
          Structured Q&A to build your canonical business profile. You’ll
          confirm before we save.
        </p>
        <BusinessContextSetup />
      </div>
    </main>
  );
}
