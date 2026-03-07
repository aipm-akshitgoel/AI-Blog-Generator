"use client";

import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
            {/* Top Banner */}
            <div className={`bg-[#342b7c] text-white py-1.5 px-4 text-center text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 ${isScrolled ? 'h-0 py-0 opacity-0 overflow-hidden' : 'min-h-[2.5rem] md:h-8 opacity-100'}`}>
                <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
                    <span>Admissions Open for PG Program in AI & ML |</span>
                    <a href="#" className="flex items-center gap-1 hover:text-[#02a7b6] transition-colors">
                        Enroll Now <Send className="w-3 h-3" />
                    </a>
                </div>
            </div>

            {/* Main Nav menu */}
            <div className={`transition-all duration-500 ${isScrolled ? 'bg-black/80 backdrop-blur-2xl border-b border-white/10 py-3 md:py-4 shadow-2xl' : 'bg-transparent py-4 md:py-8'}`}>
                <div className="parul-container px-4 md:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white italic">PARUL <span className="font-light not-italic text-white/70 text-base md:text-2xl">UNIVERSITY</span></h1>
                    </div>

                    <div className="hidden md:flex items-center gap-12 text-[11px] font-black uppercase tracking-[0.3em] text-white/70">
                        <a href="#about" className="hover:text-[#02a7b6] transition-all hover:tracking-[0.4em]">About Us</a>
                        <a href="#programmes" className="hover:text-[#02a7b6] transition-all hover:tracking-[0.4em]">PROGRAMMES</a>
                        <a href="#career" className="hover:text-[#02a7b6] transition-all hover:tracking-[0.4em]">Career</a>
                        <a href="#contact" className="ml-4 border-2 border-[#02a7b6] text-[#02a7b6] px-8 py-3 rounded-full hover:bg-[#02a7b6] hover:text-white transition-all shadow-[0_0_20px_rgba(2,167,182,0.2)]">Contact us</a>
                    </div>

                    {/* Mobile Menu Icon placeholder */}
                    <div className="md:hidden text-white">
                        <div className="w-8 h-1 bg-white mb-1"></div>
                        <div className="w-8 h-1 bg-[#02a7b6]"></div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
