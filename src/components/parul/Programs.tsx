"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Calculator, Medal } from 'lucide-react';

const Programs: React.FC = () => {
    return (
        <section id="programmes" className="bg-white text-black py-20 overflow-hidden relative">
            <div className="parul-container px-6">
                <div className="flex flex-col md:flex-row gap-20 items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                            Programs Built for <br />
                            <span className="text-[#342b7c]">Every Stage</span>
                        </h2>

                        <p className="text-xl text-gray-500 mb-12 max-w-xl font-light italic leading-relaxed">
                            From industry immersion to measurable career outcomes, Parul University delivers what typical programs can't—education designed for real-world impact and long-term success.
                        </p>

                        <div className="flex flex-col gap-6 mt-12">
                            {["Boot-camp Short Courses", "Cohort Programs", "Online MBA & BBA"].map((prog, idx) => (
                                <div key={idx} className={`text-xl font-bold cursor-pointer transition-all ${idx === 0 ? 'text-[#342b7c] text-3xl' : 'text-gray-400 hover:text-black'}`}>
                                    {prog}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="bg-gray-50 border border-gray-100 p-12 rounded-[2rem] max-w-2xl relative"
                    >
                        <div className="mb-10 block bg-[#342b7c] text-white w-fit px-4 py-1 rounded text-xs font-bold uppercase tracking-widest">Featured</div>
                        <h3 className="text-4xl md:text-5xl font-bold mb-6">The GenAI Launchpad</h3>
                        <p className="text-xl text-gray-500 mb-10 leading-relaxed font-light italic">
                            Learn AI by Solving Real Problems and Build with AI. Ship projects. Supercharge your career.
                        </p>

                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gray-200 rounded-full"><Calendar className="w-5 h-5 text-neutral-600" /></div>
                                <div>
                                    <div className="text-xs uppercase text-gray-400 font-bold">Duration</div>
                                    <div className="text-lg font-bold">3 months</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gray-200 rounded-full"><Calculator className="w-5 h-5 text-neutral-600" /></div>
                                <div>
                                    <div className="text-xs uppercase text-gray-400 font-bold">Format</div>
                                    <div className="text-lg font-bold">Live Sessions</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-12">
                            <div className="p-3 bg-gray-200 rounded-full"><Medal className="w-5 h-5 text-neutral-600" /></div>
                            <div>
                                <div className="text-xs uppercase text-gray-400 font-bold">What You'll Gain:</div>
                                <div className="text-lg font-bold italic">Launch-ready product skills with real-world application</div>
                            </div>
                        </div>

                        <a href="#" className="btn-primary w-full justify-center py-5 text-xl rounded-2xl group flex items-center gap-4 no-underline hover:text-black">
                            Explore Course <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                        </a>
                    </motion.div>
                </div>

                {/* Why Choose Parul (Horizontal Scoll / Grid) */}
                <div className="mt-60 pt-40 border-t border-gray-100 overflow-hidden">
                    <h2 className="text-5xl md:text-7xl font-bold mb-20 text-center">
                        Why Serious Professionals <br />
                        Choose <span className="text-[#342b7c]">PARUL</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[
                            { title: "Learning that lives in the real world", desc: "Industry-led curriculum, live projects with real companies, and mentorship from practitioners actively shaping your field." },
                            { title: "Academic rigor meets modern pedagogy", desc: "Comprehensive, future-relevant curriculum delivered through structured journeys, live sessions, and rigorous assessments." },
                            { title: "Learn from those who've done it", desc: "Faculty from premier institutions like IIMs, IITs, ISB, and industry veterans from Google, Microsoft, and leading organizations." },
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className="bg-gray-50 p-10 rounded-3xl hover:-translate-y-2 transition-all hover:shadow-xl"
                            >
                                <div className="w-16 h-16 bg-[#342b7c]/10 rounded-2xl mb-8 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full border-4 border-[#342b7c]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                                <p className="text-gray-500 italic font-light leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Programs;
