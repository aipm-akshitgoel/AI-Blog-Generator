"use client";

import React from 'react';
import { motion } from 'framer-motion';

const StatsAndLeaders: React.FC = () => {
    return (
        <section className="bg-black py-20 overflow-hidden relative">
            <div className="parul-container">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-6xl md:text-8xl font-black mb-8 leading-[0.8] tracking-tighter italic uppercase text-white">
                            Learn from <br />
                            <span className="text-[#02a7b6]">Visionaries</span>
                        </h2>

                        <p className="text-xl text-white/60 mb-12 max-w-lg font-light italic leading-relaxed">
                            Access 300+ CXO-led sessions featuring experts from Google, Meta, McKinsey, and more.
                        </p>

                        <div className="grid grid-cols-3 gap-8">
                            <div>
                                <div className="text-5xl font-black italic mb-1 uppercase tracking-tighter text-white">500+</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#02a7b6]">Partners</div>
                            </div>
                            <div>
                                <div className="text-5xl font-black italic mb-1 uppercase tracking-tighter text-white">300+</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#02a7b6]">Masters</div>
                            </div>
                            <div>
                                <div className="text-5xl font-black italic mb-1 uppercase tracking-tighter text-white">1000+</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#02a7b6]">Leaders</div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl"
                    >
                        <img src="/assets/leaders.png" alt="Industry Leaders" className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default StatsAndLeaders;
