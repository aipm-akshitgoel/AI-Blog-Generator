"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
    return (
        <section className="relative min-h-[95dvh] pt-32 pb-16 lg:min-h-screen lg:py-0 flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-black text-white">
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
            <div className="parul-container relative z-10 max-w-5xl pt-12 md:pt-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                >
                    <h1 className="text-[2.75rem] md:text-5xl lg:text-[10rem] font-black tracking-tighter mb-4 md:mb-8 leading-[0.9] md:leading-[0.8] italic uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        Education <br />
                        <span className="text-[#02a7b6] italic block drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">Transforms</span>
                    </h1>

                    <p className="text-base md:text-2xl text-white max-w-2xl mx-auto mb-6 md:mb-12 leading-relaxed font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,1)] px-4 md:px-0">
                        Parul University brings premium, industry-aligned learning to your screen. Build skills that matter.
                    </p>

                    <div className="flex justify-center px-6">
                        <a href="#programmes" className="btn-primary group py-3 md:py-6 px-6 md:px-16 text-base md:text-2xl font-black italic rounded-full shadow-[0_0_50px_rgba(2,167,182,0.4)]">
                            Explore Programmes
                            <ArrowRight className="w-4 h-4 md:w-8 md:h-8 group-hover:translate-x-3 transition-transform ml-2" />
                        </a>
                    </div>
                </motion.div>

                {/* Ranking Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mt-8 md:mt-20 px-4 md:px-0">
                    {[
                        { title: "Top 5 World Ranking", icon: "/assets/logos/nirf.webp" },
                        { title: "Rank 1: Top Management", icon: "/assets/logos/naac.webp" },
                        { title: "Best Institution 2024", icon: "/assets/logos/qs.webp" },
                        { title: "King's Award 2024", icon: "/assets/logos/award.webp" }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-4 md:p-6 rounded-xl md:rounded-2xl flex items-center justify-center h-20 md:h-32 hover:bg-white/10 transition-all duration-300 hover:scale-[1.03] cursor-pointer group">
                            <img src={item.icon} alt={item.title} className="h-10 md:h-16 lg:h-20 w-auto object-contain drop-shadow-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Hero;
