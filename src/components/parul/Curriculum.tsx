"use client";

import React from 'react';
import { motion } from 'framer-motion';

const Curriculum: React.FC = () => {
    return (
        <section className="bg-black py-20 overflow-hidden relative">
            <div className="parul-container px-6">
                <div className="flex flex-col md:flex-row gap-20 items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-2xl"
                    >
                        <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight text-white">
                            Curriculum Built <br />
                            for <span className="text-[#02a7b6]">Tomorrow</span>
                        </h2>

                        <p className="text-xl text-gray-400 mb-12 font-light italic leading-relaxed">
                            Parul University delivers more than just lectures—it’s a comprehensive learning journey combining academic rigor, cutting-edge content, and modern pedagogy designed to keep you ahead of industry evolution.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { title: "Content that evolves with the market", desc: "Curriculum continuously updated to reflect emerging trends, built with input from industry leaders to ensure relevance." },
                            { title: "Progressive mastery through active participation", desc: "Sequenced modules combining live interactive sessions, self-paced learning, case studies, and collaborative problem-solving—designed for depth, not just completion." },
                            { title: "Learning validated through real application", desc: "Access to industry conferences, symposiums, and networking events designed exclusively for Parul learners." },
                            { title: "Academic rigor meets modern pedagogy", desc: "Digital Learning, Real-World Connections experience the Parul University campus, collaborate in person during residencies, and engage with industry leaders." }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className="bg-white/5 backdrop-blur-xl border-l-4 border-[#02a7b6] p-8 rounded-r-2xl hover:bg-white/10 transition-colors"
                            >
                                <h3 className="text-2xl font-bold mb-4 text-white">{item.title}</h3>
                                <p className="text-gray-400 italic text-sm font-medium leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Curriculum;
