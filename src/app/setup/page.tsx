"use client";

import { useState } from "react";
import { BusinessContextSetup } from "@/components/BusinessContextSetup";
import { StrategyAgentUI } from "@/components/StrategyAgent";
import { ContentAgentUI } from "@/components/ContentAgent";
import { OptimizationAgentUI } from "@/components/OptimizationAgentUI";
import { MetaSeoAgentUI } from "@/components/MetaSeoAgentUI";
import { SchemaAgentUI } from "@/components/SchemaAgentUI";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { StrategySession } from "@/lib/types/strategy";
import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";
import Link from "next/link";

export default function SetupPage() {
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [strategySession, setStrategySession] = useState<StrategySession | null>(null);
  const [generatedPost, setGeneratedPost] = useState<BlogPost | null>(null);
  const [optimizedPost, setOptimizedPost] = useState<OptimizedContent | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<MetaOption | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<SchemaData | null>(null);

  const handleStrategyApprove = (session: StrategySession) => {
    // In a real app, you would POST this to an API to save it to DB
    setStrategySession(session);
    console.log("Saved strategy!", session);
  };

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-2xl">


        <h1 className="mb-2 text-2xl font-bold text-neutral-100">
          Agent Workspace
        </h1>
        <p className="mb-8 text-neutral-400">
          Orchestrating your business profile and SEO strategy.
        </p>

        <div className="space-y-6">
          {!context && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <BusinessContextSetup onComplete={setContext} />
            </div>
          )}

          {context && !strategySession && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <StrategyAgentUI
                businessContext={context}
                onApprove={handleStrategyApprove}
                onModify={() => console.log("User wants to modify strategy")}
              />
            </div>
          )}

          {strategySession && context && (
            <>
              <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-6 shadow-xl animate-in zoom-in-95 duration-500 hidden">
                {/* Keep the success state hidden or small, rely on Content Agent UI instead */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-emerald-400">Setup Complete</h2>
                </div>
                <p className="mt-2 text-sm text-emerald-200/70">
                  Business context and targeted topic strategy have been generated and approved.
                  Ready to proceed to content generation!
                </p>
              </div>

              {!generatedPost && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <ContentAgentUI
                    businessContext={context}
                    topic={strategySession.topicOptions[0]} // Auto-generate the first topic
                    onComplete={(post) => setGeneratedPost(post)}
                  />
                </div>
              )}

              {generatedPost && !optimizedPost && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <OptimizationAgentUI
                    post={generatedPost}
                    onComplete={(optim) => setOptimizedPost(optim)}
                  />
                </div>
              )}

              {optimizedPost && !selectedMeta && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <MetaSeoAgentUI
                    optimized={optimizedPost!}
                    onComplete={(metaOption) => setSelectedMeta(metaOption)}
                  />
                </div>
              )}

              {selectedMeta && !generatedSchema && (
                <div className="animate-in slide-in-from-top-4 duration-500">
                  <SchemaAgentUI
                    optimizedContent={optimizedPost!}
                    businessContext={context!}
                    meta={selectedMeta}
                    onComplete={(schema) => setGeneratedSchema(schema)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
