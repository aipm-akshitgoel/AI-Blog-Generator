"use client";

import React from 'react';
import { motion } from 'framer-motion';

const Ticker: React.FC = () => {
    const companies = [
        "Google", "Meta", "McKinsey", "BCG", "Amazon", "Mastercard", "Mondelez", "Godrej", "Colgate", "Jio", "HDFC Life", "L'Oréal"
    ];

    return (
        <section className="bg-black pt-8 pb-16 md:pt-4 md:pb-20 px-4 overflow-hidden">
            <div className="parul-container">
                <div className="text-gray-400 text-center mb-6 md:mb-8 text-sm font-medium tracking-widest uppercase italic font-black">
                    Powering the careers of those at:
                </div>

                <div className="relative flex overflow-x-hidden">
                    <motion.div
                        className="py-12 flex whitespace-nowrap gap-20 items-center justify-center"
                        animate={{ x: [0, -1000] }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    >
                        {[...companies, ...companies].map((name, idx) => (
                            <div key={idx} className="text-3xl md:text-5xl font-extrabold text-white/20 whitespace-nowrap uppercase tracking-tighter italic">
                                {name}
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="mt-20 text-center max-w-4xl mx-auto">
                    <p className="text-gray-300 text-xl font-light italic leading-relaxed">
                        "We brings you faculty with unmatched credentials academic leaders from premier institutions and industry veterans from the companies reshaping business and technology."
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Ticker;
