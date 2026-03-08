"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Building2, Globe } from 'lucide-react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-black text-white relative overflow-hidden border-t border-white/5 font-main">
            {/* Campus Background Section */}
            <div className="relative py-16 md:py-32 border-b border-white/5">
                <div className="absolute inset-0 z-0 opacity-40">
                    <img
                        src="/assets/campus.png"
                        alt="Campus Panoramic"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/90" />
                </div>

                <div className="parul-container relative z-10 px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-5xl md:text-8xl font-black mb-6 md:mb-8 leading-[0.8] tracking-tighter italic uppercase">
                                Real-World <br />
                                <span className="text-[#02a7b6]">Campus</span>
                            </h2>
                            <p className="text-lg md:text-xl text-white/50 font-light italic leading-relaxed max-w-xl mb-8 md:mb-12">
                                Experience the Parul University campus, celebrate success in person, and engage with industry leaders.
                            </p>

                            <div className="space-y-8">
                                <div className="flex gap-4 items-center">
                                    <MapPin className="text-[#02a7b6] w-8 h-8" />
                                    <div className="text-xl font-black italic uppercase tracking-tighter">Mumbai's Business Heart</div>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <Building2 className="text-[#342b7c] w-8 h-8" />
                                    <div className="text-xl font-black italic uppercase tracking-tighter">Grade-A Learning Labs</div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col justify-end min-h-[350px] md:min-h-[500px] group transition-all relative overflow-hidden"
                        >
                            <Globe className="absolute top-10 right-10 w-20 h-20 md:w-32 md:h-32 opacity-10 group-hover:rotate-45 transition-transform duration-1000" />
                            <h3 className="text-3xl md:text-4xl font-black mb-6 italic uppercase tracking-tighter">Visit Parul</h3>
                            <a href="#" className="btn-primary w-fit px-8 md:px-12 py-4 md:py-5 rounded-full text-lg md:text-xl font-black italic uppercase shadow-[0_0_50px_rgba(2,167,182,0.3)] group no-underline">
                                Reach Out <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform ml-2" />
                            </a>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Final Bottom section */}
            <div className="parul-container pt-10 md:pt-20 pb-16 md:pb-24 px-6 text-center">
                <div className="text-2xl md:text-4xl font-black tracking-tighter mb-6 md:mb-8 italic uppercase text-white/20">PARUL UNIVERSITY</div>
                <div className="text-[8px] md:text-[10px] font-black tracking-[0.4em] text-white/30 uppercase">
                    © 2026 PARUL UNIVERSITY. ALL RIGHTS RESERVED.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
