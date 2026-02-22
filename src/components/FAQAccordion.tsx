"use client";

import { useState } from "react";

interface FAQ {
    question: string;
    answer: string;
}

interface FAQAccordionProps {
    faqs: FAQ[];
    theme: "minimal" | "magazine";
}

export function FAQAccordion({ faqs, theme }: FAQAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    if (theme === "minimal") {
        return (
            <div className="space-y-4">
                {faqs.map((faq, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div key={i} className="border-b border-neutral-200 pb-4">
                            <button
                                onClick={() => toggle(i)}
                                className="w-full flex items-center justify-between text-left py-2 focus:outline-none group"
                            >
                                <h3 className="text-lg font-serif font-semibold text-neutral-800 pr-8 group-hover:text-neutral-600 transition-colors">
                                    {faq.question}
                                </h3>
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-neutral-300 text-neutral-500 group-hover:bg-neutral-50 transition-colors">
                                    {isOpen ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                            <div
                                className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
                                    }`}
                            >
                                <div className="overflow-hidden">
                                    <p className="text-base text-neutral-600 leading-relaxed font-serif pb-2">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Magazine theme
    return (
        <div className="space-y-4">
            {faqs.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => toggle(i)}
                            className="w-full flex items-center justify-between text-left p-6 focus:outline-none group hover:bg-neutral-50/50 transition-colors"
                        >
                            <h3 className="text-base font-bold text-neutral-900 pr-8 group-hover:text-emerald-700 transition-colors">
                                {faq.question}
                            </h3>
                            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-500 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
                                {isOpen ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                    </svg>
                                )}
                            </div>
                        </button>
                        <div
                            className={`grid transition-all duration-300 ease-in-out px-6 ${isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"
                                }`}
                        >
                            <div className="overflow-hidden">
                                <p className="text-base text-neutral-600 leading-relaxed border-t border-neutral-100 pt-4">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
