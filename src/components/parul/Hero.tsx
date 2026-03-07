"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
    return (
        <section className="relative h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-black text-white">
            {/* Background elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/60 via-black/30 to-black z-10" />
                <img
                    src="/assets/hero-bg-v2.png"
                    alt="Campus Background"
                    className="w-full h-full object-cover opacity-70"
                />
            </div>

            {/* Content */}
            <div className="parul-container relative z-10 max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                >
                    <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter mb-8 leading-[0.8] italic uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        Education <br />
                        <span className="text-[#02a7b6] italic block drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">Transforms</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-white max-w-2xl mx-auto mb-12 leading-relaxed font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                        Parul University brings premium, industry-aligned learning to your screen. Build skills that matter.
                    </p>

                    <div className="flex justify-center">
                        <a href="#programmes" className="btn-primary group py-6 px-16 text-2xl font-black italic rounded-full shadow-[0_0_50px_rgba(2,167,182,0.4)]">
                            Explore Programmes
                            <ArrowRight className="w-8 h-8 group-hover:translate-x-3 transition-transform ml-2" />
                        </a>
                    </div>
                </motion.div>

                {/* Ranking Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
                    {[
                        "Top 5 World Ranking",
                        "Rank 1: Top Management",
                        "Best Institution 2024",
                        "King's Award 2024"
                    ].map((title, idx) => (
                        <div key={idx} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl flex flex-col justify-end text-left h-32 hover:bg-white/10 transition-all">
                            <div className="text-sm font-black italic uppercase leading-tight">{title}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Hero;
