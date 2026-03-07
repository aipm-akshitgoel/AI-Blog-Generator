"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const Testimonials: React.FC = () => {
    return (
        <section className="bg-black text-white py-20 overflow-hidden relative">
            <div className="parul-container px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-24"
                >
                    <h2 className="text-5xl md:text-7xl font-bold mb-8">
                        Hear From Those <br />
                        <span className="text-[#02a7b6]">Who've Been There</span>
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            name: "Kritija Mugdha",
                            batch: "Batch of 2026",
                            quote: "Parul University helped me grow exponentially, and pushed me to my limits to understand what I wanted to do professionally."
                        },
                        {
                            name: "Samantha Lee",
                            batch: "Batch of 2025",
                            quote: "The mentorship and resources provided by Parul University were invaluable in shaping my career path and honing my skills."
                        },
                        {
                            name: "Jordan Patel",
                            batch: "Batch of 2024",
                            quote: "Parul University challenged my thinking and opened doors to opportunities I never imagined possible."
                        }
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1, duration: 0.6 }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-3xl flex flex-col justify-between hover:bg-white/10 transition-colors"
                        >
                            <Quote className="w-12 h-12 text-[#02a7b6] mb-8" />
                            <p className="text-2xl font-light italic leading-relaxed mb-10 text-gray-300">
                                "{item.quote}"
                            </p>
                            <div>
                                <div className="text-xl font-bold">{item.name}</div>
                                <div className="text-xs uppercase tracking-widest text-gray-400 font-bold border-t border-white/10 mt-4 pt-4">
                                    {item.batch}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
