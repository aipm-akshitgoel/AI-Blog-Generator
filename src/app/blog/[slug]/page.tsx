import { notFound } from "next/navigation";
import { getBlogBySlug } from "@/lib/blogDb";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import Script from "next/script";
import { FAQAccordion } from "@/components/FAQAccordion";

export const dynamic = 'force-dynamic';

/**
 * Strips common LLM-hallucinated CTA blocks that the model may append to
 * contentMarkdown even when instructed not to, e.g. "Ready to book..." / "Click here"
 */
function stripLLMCTA(markdown: string): string {
    return markdown
        // Remove any trailing paragraph/heading that smells like a CTA
        .replace(/\n{1,}(?:##?\s*)?(?:Ready to|Book (?:an? )?(?:appointment|now|today)|Schedule|Click here|Call us|Contact us)[\s\S]*$/i, "")
        .trim();
}

/**
 * Extracts only the Article/BlogPosting node from a combined JSON-LD @graph.
 * Org-level schemas (HairSalon, WebSite, Organization) should live in the
 * global layout — not repeated on every blog post.
 */
function extractArticleSchema(jsonLd: string): string {
    try {
        const parsed = JSON.parse(jsonLd);
        if (Array.isArray(parsed['@graph'])) {
            const articleTypes = new Set(['Article', 'BlogPosting', 'NewsArticle']);
            const filtered = { ...parsed, '@graph': parsed['@graph'].filter((n: any) => articleTypes.has(n['@type'])) };
            return JSON.stringify(filtered);
        }
        return jsonLd;
    } catch {
        return jsonLd;
    }
}

export default async function PublicBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const blog = await getBlogBySlug(resolvedParams.slug);

    if (!blog) {
        notFound();
    }

    const { content, images, schema } = blog.payload;

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 selection:bg-emerald-200">
            {/* Inject JSON-LD Schema for SEO */}
            {schema && schema.jsonLd && (
                <Script id="blog-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: extractArticleSchema(schema.jsonLd) }} />
            )}

            {/* Public Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="font-black text-xl tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                            <span className="font-serif font-bold text-lg leading-none">B</span>
                        </div>
                        {blog.payload.meta?.title.split(' ')[0] || "Blog"}
                    </Link>
                </div>
            </header>

            {blog.templateId === 'magazine' ? (
                <article className="max-w-6xl mx-auto px-4 py-12 md:py-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center mb-16 lg:mb-24">
                        <div className="lg:col-span-5 order-2 lg:order-1">
                            <header className="text-left">
                                <div className="inline-flex items-center rounded-none bg-neutral-900 px-3 py-1 text-xs font-bold text-white tracking-[0.2em] uppercase mb-8">
                                    Editorial • {new Date(blog.createdAt).toLocaleDateString()}
                                </div>
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif tracking-tight text-neutral-900 mb-8 leading-[1.05]">
                                    {blog.title}
                                </h1>
                                {blog.payload.meta?.description && (
                                    <p className="text-xl text-neutral-500 leading-relaxed border-l-2 border-neutral-300 pl-6 italic font-serif">
                                        {blog.payload.meta.description}
                                    </p>
                                )}
                            </header>
                        </div>

                        {images?.bannerImageUrl && (
                            <div className="lg:col-span-7 order-1 lg:order-2 w-full aspect-[4/3] relative overflow-hidden">
                                <img
                                    src={images.bannerImageUrl}
                                    alt={images.altText || blog.title}
                                    className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
                                />
                            </div>
                        )}
                    </div>

                    <div className="lg:w-8/12 mx-auto">
                        <div className="prose prose-lg md:prose-xl prose-stone max-w-none 
                            prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight 
                            prose-h2:text-4xl prose-h3:text-2xl
                            prose-a:text-neutral-900 prose-a:underline prose-a:decoration-1 prose-a:underline-offset-4 hover:prose-a:decoration-4
                            prose-img:rounded-none">
                            <ReactMarkdown>{stripLLMCTA(content.contentMarkdown)}</ReactMarkdown>

                            {content.faqs && content.faqs.length > 0 && (
                                <div className="mt-16">
                                    <h2 className="text-4xl font-serif text-neutral-900 mb-8 border-b border-neutral-200 pb-4">Frequently Asked Questions</h2>
                                    <FAQAccordion faqs={content.faqs} theme="minimal" />
                                </div>
                            )}
                        </div>

                        {blog.payload.cta && (
                            <div className="mt-24 border-y border-neutral-200 py-16 text-center bg-neutral-50">
                                <h2 className="text-4xl font-serif mb-6 text-neutral-900">{blog.payload.cta.ctaHeadline || "Ready to elevate your look?"}</h2>
                                <p className="text-xl text-neutral-500 mb-10 max-w-2xl mx-auto font-serif italic">{blog.payload.cta.ctaCopy}</p>
                                <a
                                    href={blog.payload.cta.ctaLink}
                                    className="inline-block rounded-none border border-neutral-900 bg-neutral-900 px-10 py-5 text-sm tracking-[0.2em] uppercase font-bold text-white transition-colors hover:bg-neutral-800"
                                >
                                    {blog.payload.cta.ctaButtonText || "Book Now"}
                                </a>
                            </div>
                        )}
                    </div>
                </article>
            ) : (
                <article className="max-w-3xl mx-auto px-4 py-12 md:py-20">
                    {/* Blog Header */}
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 tracking-wide uppercase mb-6">
                            Published • {new Date(blog.createdAt).toLocaleDateString()}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900 mb-6 leading-tight">
                            {blog.title}
                        </h1>
                        {blog.payload.meta?.description && (
                            <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
                                {blog.payload.meta.description}
                            </p>
                        )}
                    </header>

                    {/* Banner Image */}
                    {images?.bannerImageUrl && (
                        <div className="w-full aspect-video rounded-3xl overflow-hidden mb-16 shadow-2xl relative">
                            {/* Using standard img tag, Next/Image requires domain config */}
                            <img
                                src={images.bannerImageUrl}
                                alt={blog.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Markdown Content */}
                    <div className="prose prose-lg md:prose-xl prose-neutral max-w-none 
                        prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-2xl prose-img:shadow-lg prose-pre:bg-neutral-900 prose-pre:text-neutral-100">
                        <ReactMarkdown>{content.contentMarkdown}</ReactMarkdown>

                        {content.faqs && content.faqs.length > 0 && (
                            <div className="mt-16 bg-neutral-100 rounded-3xl p-8 md:p-12 not-prose">
                                <h2 className="text-3xl font-black text-neutral-900 mb-8 flex items-center gap-3">
                                    <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Frequently Asked Questions
                                </h2>
                                <FAQAccordion faqs={content.faqs} theme="magazine" />
                            </div>
                        )}
                    </div>

                    {/* Call to Action Module */}
                    {blog.payload.cta && (
                        <div className="mt-20 rounded-3xl bg-neutral-900 p-8 md:p-12 text-center text-white shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4"></div>

                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold mb-4">{blog.payload.cta.ctaHeadline || "Ready to elevate your look?"}</h2>
                                <p className="text-lg text-neutral-400 mb-8 max-w-xl mx-auto">{blog.payload.cta.ctaCopy}</p>
                                <a
                                    href={blog.payload.cta.ctaLink}
                                    className="inline-block rounded-full bg-emerald-500 px-8 py-4 text-lg font-bold text-white transition-transform hover:scale-105 hover:bg-emerald-400"
                                >
                                    {blog.payload.cta.ctaButtonText || "Book Now"}
                                </a>
                            </div>
                        </div>
                    )}
                </article>
            )}

            <footer className="border-t border-neutral-200 mt-20 py-12 text-center">
                <p className="text-neutral-500 text-sm">
                    © {new Date().getFullYear()} Generated by Bloggie AI. All rights reserved.
                </p>
            </footer>
        </main>
    );
}
