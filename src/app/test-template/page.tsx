"use client";

import Navbar from "@/components/parul/Navbar";
import Hero from "@/components/parul/Hero";
import Ticker from "@/components/parul/Ticker";
import StatsAndLeaders from "@/components/parul/StatsAndLeaders";
import Curriculum from "@/components/parul/Curriculum";
import Programs from "@/components/parul/Programs";
import Testimonials from "@/components/parul/Testimonials";
import FAQ from "@/components/parul/FAQ";
import Footer from "@/components/parul/Footer";

export default function TestTemplatePage() {
    return (
        <div className="bg-black text-white min-h-screen">
            <Navbar />
            <Hero />
            <Ticker />
            <StatsAndLeaders />
            <Curriculum />
            <Programs />
            <Testimonials />
            <FAQ />
            <Footer />
        </div>
    );
}
