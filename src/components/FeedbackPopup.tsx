"use client";

import { useState, useEffect } from "react";

interface FeedbackPopupProps {
    blogId: string;
    blogTitle: string;
}

export function FeedbackPopup({ blogId, blogTitle }: FeedbackPopupProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0); // 0: Hidden, 1: Intro, 2: Basic, 3: Content, 4: SEO, 5: Agents, 6: Success
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [email, setEmail] = useState("");
    const [overallRating, setOverallRating] = useState<number>(0);
    const [contentScore, setContentScore] = useState<number>(0);
    const [contentFeedback, setContentFeedback] = useState("");
    const [seoScore, setSeoScore] = useState<number>(0);
    const [seoFeedback, setSeoFeedback] = useState("");
    const [agentFeedback, setAgentFeedback] = useState({
        strategy: "",
        image: "",
        cta: ""
    });

    useEffect(() => {
        // Only show if not previously dismissed/submitted for this blog
        const hasSubmitted = localStorage.getItem(`bloggie_feedback_${blogId}`);
        if (!hasSubmitted) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                setStep(1);
            }, 20000); // 20 seconds
            return () => clearTimeout(timer);
        }
    }, [blogId]);

    if (!isOpen || step === 0) return null;

    const handleDismiss = () => {
        setIsOpen(false);
        // We don't mark as permanently submitted if just dismissed, so they can see it again next time they open the page?
        // Or maybe we should to avoid annoying them. Let's mark as dismissed temporarily via session storage.
        sessionStorage.setItem(`bloggie_feedback_dismissed_${blogId}`, "true");
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    blog_id: blogId,
                    blog_title: blogTitle,
                    user_email: email,
                    overall_rating: overallRating,
                    content_score: contentScore,
                    content_feedback: contentFeedback,
                    seo_score: seoScore,
                    seo_feedback: seoFeedback,
                    agent_feedback: agentFeedback
                })
            });

            if (res.ok) {
                localStorage.setItem(`bloggie_feedback_${blogId}`, "true");
                setStep(6);
                setTimeout(() => setIsOpen(false), 3000);
            } else {
                alert("Failed to submit feedback. Please try again.");
            }
        } catch (error) {
            alert("Error submitting feedback.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const StarRating = ({ value, onChange, label }: { value: number, onChange: (val: number) => void, label: string }) => (
        <div className="mb-4">
            <label className="block text-sm font-bold text-neutral-300 mb-2 uppercase tracking-wider">{label} <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => onChange(star)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${value >= star ? 'bg-emerald-500 text-white hover:scale-110' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}
                    >
                        ★
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                {/* Header Actions */}
                <div className="flex justify-end pt-4 pr-4 absolute top-0 right-0 w-full z-10 pointer-events-none">
                    <button onClick={handleDismiss} className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-8">
                    {/* Progress Bar */}
                    {step > 1 && step < 6 && (
                        <div className="w-full bg-neutral-800 h-1 rounded-full mb-8 overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${((step - 1) / 4) * 100}%` }} />
                        </div>
                    )}

                    {step === 1 && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <span className="text-2xl">🎁</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight mb-2">Claim 1-Year Free Access</h2>
                                <p className="text-neutral-400">
                                    Share your expert feedback on this generated draft to help us improve Bloggie AI, and we'll upgrade your account to a full year of premium access for free.
                                </p>
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/50 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                Start Feedback
                            </button>
                            <button onClick={handleDismiss} className="text-sm font-semibold text-neutral-500 hover:text-neutral-300 underline underline-offset-4 decoration-neutral-700 transition-colors">
                                No thanks, maybe later
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight mb-1">The Basics</h3>
                                <p className="text-sm text-neutral-400">Let's start with your overall impression.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-neutral-300 mb-2 uppercase tracking-wider">Your Email <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="To receive your 1-year free upgrade"
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-600"
                                    />
                                </div>
                                <StarRating value={overallRating} onChange={setOverallRating} label="Overall Rating" />
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                disabled={!email || overallRating === 0}
                                className="w-full bg-white text-black font-bold py-3.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-200"
                            >
                                Next: Content Quality
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight mb-1">Content Writer Agent</h3>
                                <p className="text-sm text-emerald-400/80 font-medium">How well did the LLM write the blog?</p>
                            </div>

                            <div className="space-y-4">
                                <StarRating value={contentScore} onChange={setContentScore} label="Writing Quality Score" />
                                <div>
                                    <label className="block text-sm font-bold text-neutral-300 mb-2 uppercase tracking-wider">Qualitative Feedback <span className="text-neutral-500 font-normal normal-case">(Optional but loved!)</span></label>
                                    <textarea
                                        value={contentFeedback}
                                        onChange={e => setContentFeedback(e.target.value)}
                                        placeholder="How was the tone, structure, and formatting? Did it sound human? Any weird fluff words?"
                                        rows={4}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-600 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(2)} className="px-4 py-3.5 rounded-xl font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors">Back</button>
                                <button
                                    onClick={() => setStep(4)}
                                    disabled={contentScore === 0}
                                    className="flex-1 bg-white text-black font-bold py-3.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-200"
                                >
                                    Next: SEO Quality
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight mb-1">SEO Optimizer Agent</h3>
                                <p className="text-sm text-emerald-400/80 font-medium">How good was the on-page SEO optimization?</p>
                            </div>

                            <div className="space-y-4">
                                <StarRating value={seoScore} onChange={setSeoScore} label="SEO Technical Score" />
                                <div>
                                    <label className="block text-sm font-bold text-neutral-300 mb-2 uppercase tracking-wider">Qualitative Feedback <span className="text-neutral-500 font-normal normal-case">(Optional)</span></label>
                                    <textarea
                                        value={seoFeedback}
                                        onChange={e => setSeoFeedback(e.target.value)}
                                        placeholder="How were the meta tags, internal links, keyword density, and schema markup?"
                                        rows={4}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-600 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(3)} className="px-4 py-3.5 rounded-xl font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors">Back</button>
                                <button
                                    onClick={() => setStep(5)}
                                    disabled={seoScore === 0}
                                    className="flex-1 bg-white text-black font-bold py-3.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-200"
                                >
                                    Next: Other Agents
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight mb-1">Other Agents (Optional)</h3>
                                <p className="text-sm text-neutral-400">Notice anything about the other AI agents?</p>
                            </div>

                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Topical Strategy Agent</label>
                                    <input
                                        type="text"
                                        value={agentFeedback.strategy}
                                        onChange={e => setAgentFeedback({ ...agentFeedback, strategy: e.target.value })}
                                        placeholder="Did it pick good topics?"
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-neutral-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Image / Banner Agent</label>
                                    <input
                                        type="text"
                                        value={agentFeedback.image}
                                        onChange={e => setAgentFeedback({ ...agentFeedback, image: e.target.value })}
                                        placeholder="How was the Unsplash image selected?"
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-neutral-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">CTA Generation Agent</label>
                                    <input
                                        type="text"
                                        value={agentFeedback.cta}
                                        onChange={e => setAgentFeedback({ ...agentFeedback, cta: e.target.value })}
                                        placeholder="Was the CTA persuasive?"
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-neutral-600"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(4)} disabled={isSubmitting} className="px-4 py-3.5 rounded-xl font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50">Back</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/50 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? "Submitting..." : "Submit Feedback"}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="animate-in zoom-in-95 duration-500 text-center space-y-4 py-6">
                            <div className="w-20 h-20 mx-auto bg-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/30">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Thank You!</h2>
                            <p className="text-neutral-400">
                                Your feedback is invaluable. We've received your submission and will be applying the 1-year free credit to your account shortly!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
