import { FAQAccordion } from "@/components/FAQAccordion";

const DEMO_FAQS = [
  {
    question: "What is Online University and who is this FAQ page for?",
    answer:
      "Online University is a demonstration-only learning brand used to showcase how AI-generated FAQs can be presented on a modern admissions page. This page is static and intended for demos, stakeholder walkthroughs, and UI validation.",
  },
  {
    question: "Are these FAQs connected to a live backend?",
    answer:
      "No. The content on this page is intentionally static for reliability during demos. It does not call external APIs, databases, or publishing services, so it always renders instantly and consistently.",
  },
  {
    question: "What programs does Online University currently highlight?",
    answer:
      "For this demo, Online University highlights AI Product Management, Business Analytics, Full-Stack Development, and Digital Marketing pathways. Program names are illustrative and can be replaced with tenant-specific offerings anytime.",
  },
  {
    question: "How does AI decide which FAQ questions to generate?",
    answer:
      "In a production workflow, AI can synthesize common questions from search intent, support tickets, and conversion data. For this demo slug, the list is pre-curated to simulate that output while remaining fixed and reviewable.",
  },
  {
    question: "Can this page support multiple universities and branding themes?",
    answer:
      "Yes. The same FAQ structure can be reused across multiple institutions with different labels, colors, and question sets. This demo uses the neutral 'Online University' identity to keep the content broadly applicable.",
  },
  {
    question: "How often should FAQ content be refreshed?",
    answer:
      "A practical cadence is every 4-8 weeks or whenever admissions policy, fees, scholarship rules, or placement outcomes change. Frequent updates keep answers accurate and improve trust with prospective learners.",
  },
  {
    question: "Can students rely on these answers for official policy decisions?",
    answer:
      "Not directly. For official academic, legal, or financial policy, students should always refer to the institution's formal documentation and admissions team. FAQ pages are best treated as guidance-first content.",
  },
  {
    question: "Does this demo include multilingual FAQ support?",
    answer:
      "This page currently ships in English only, but the same content model can be extended to multilingual variants using locale-specific routes and translated FAQ payloads without changing the UI pattern.",
  },
  {
    question: "What conversion actions can be attached below FAQs?",
    answer:
      "Common actions include 'Talk to Counselor', 'Download Brochure', 'Check Eligibility', and 'Apply Now'. Demo pages typically pair FAQs with one primary CTA to reduce drop-off and focus user intent.",
  },
  {
    question: "Can this static FAQ page be converted to dynamic publishing later?",
    answer:
      "Absolutely. This slug can be switched to dynamic data by replacing the local array with API-backed content while keeping the same layout component, making the transition low-risk and incremental.",
  },
];

export default function AiFaqTestPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_45%,#f8fafc_100%)] px-6 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
        <div className="mb-2 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold tracking-wide text-violet-700">
          AI FAQ Demo
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Online University
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          A static demonstration page with AI-style frequently asked questions.
        </p>

        <div className="mt-8">
          <FAQAccordion faqs={DEMO_FAQS} theme="magazine" />
        </div>
      </div>
    </main>
  );
}
