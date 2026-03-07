"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQ: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(0);

    const questions = [
        {
            q: "Are Parul University Online programs UGC-recognized?",
            a: "Yes. Parul University Online programs, including our Online MBA and Online BBA, are offered through Parul University's Centre for Distance and Online Education and are fully UGC-recognized. You'll earn a legitimate university degree, not just a certification."
        },
        {
            q: "How is online learning different from traditional online courses?",
            a: "Our programs focus on industry-led curriculum, live sessions, and hands-on projects, rather than just self-paced video content."
        },
        {
            q: "Can I work full-time while pursuing an Parul University Online program?",
            a: "Yes. The programs are designed for working professionals with flexible schedules and evening/weekend live sessions."
        },
        {
            q: "What kind of career support do I get?",
            a: "We offer mentorship, job placement assistance, and access to a massive hiring partner network of over 500+ companies."
        },
        {
            q: "What's the difference between bootcamps, cohort programs, and degree programs?",
            a: "Bootcamps are short-term and intensive, cohort programs focus on a specific domain with peer groups, and degree programs lead to a formal university qualification."
        }
    ];

    return (
        <section className="bg-white text-black py-20 overflow-hidden relative">
            <div className="parul-container px-6 max-w-4xl">
                <div className="flex flex-col md:flex-row gap-20 items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-5xl md:text-7xl font-bold mb-20 leading-tight">
                            Questions? <br />
                            We've Got <span className="text-[#342b7c]">Answers</span>
                        </h2>
                    </motion.div>
                </div>

                <div className="flex flex-col gap-6">
                    {questions.map((item, idx) => (
                        <div key={idx} className="border-b border-gray-100 py-8">
                            <button
                                className="w-full flex items-center justify-between text-left group"
                                onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
                            >
                                <span className="text-2xl font-bold group-hover:text-[#342b7c] transition-colors">{item.q}</span>
                                <ChevronDown className={`w-8 h-8 transition-transform ${activeIndex === idx ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence initial={false}>
                                {activeIndex === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="mt-8 text-xl text-gray-500 font-light italic leading-relaxed">
                                            {item.a}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
