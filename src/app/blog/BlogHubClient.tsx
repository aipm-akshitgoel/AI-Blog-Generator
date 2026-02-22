"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import type { SavedBlog } from '@/lib/blogDb';

interface Props {
    blogs: SavedBlog[];
    allBlogs: SavedBlog[];
    categories: string[];
    activeCategory: string | null;
}

export default function BlogHubClient({ blogs, categories, activeCategory }: Props) {
    const router = useRouter();

    const setFilter = (cat: string | null) => {
        if (cat) router.push(`/blog?category=${encodeURIComponent(cat)}`);
        else router.push('/blog');
    };

    // Split blogs for the "All Posts" view
    const isAllPosts = !activeCategory;
    const popularBlogs = isAllPosts ? blogs.slice(0, 3) : [];
    const latestBlogs = isAllPosts ? blogs.slice(3) : blogs;

    return (
        <main className="min-h-screen bg-neutral-50 selection:bg-indigo-200">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="font-black text-xl tracking-tight flex items-center gap-2 text-neutral-900">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                            <span className="font-serif font-bold text-lg leading-none">B</span>
                        </div>
                        Bloggie Hub
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-neutral-900 text-white py-16 md:py-24">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-serif tracking-tight mb-6">Explore the Future</h1>
                    <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10">
                        Discover insights and deep dives published seamlessly using our AI engine.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            onClick={() => setFilter(null)}
                            className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${!activeCategory
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                }`}
                        >
                            All Posts
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${activeCategory === cat
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Popular Section (Only on All Posts) */}
            {isAllPosts && popularBlogs.length > 0 && (
                <section className="py-16 bg-white border-b border-neutral-200">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="flex items-center gap-3 mb-10">
                            <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter">Popular Posts</h2>
                            <div className="flex-1 h-px bg-neutral-200" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {popularBlogs.map(blog => (
                                <Link
                                    href={`/blog/${blog.slug}`}
                                    key={blog.id}
                                    className="group relative flex flex-col gap-4"
                                >
                                    <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-1">
                                        <img
                                            src={blog.payload.images?.bannerImageUrl}
                                            alt={blog.title}
                                            className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-neutral-900/90 text-[10px] font-black text-white uppercase tracking-widest rounded-full backdrop-blur">
                                                Trending
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-neutral-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                            {blog.title}
                                        </h3>
                                        <p className="text-xs text-neutral-500 font-medium">
                                            {formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Blog Grid (Latest Posts) */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter">
                            {activeCategory ? activeCategory : 'Latest Posts'}
                        </h2>
                        <span className="text-sm font-bold text-neutral-400 tracking-widest uppercase">
                            {latestBlogs.length} Article{latestBlogs.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {latestBlogs.length === 0 && !isAllPosts ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200">
                            <h3 className="text-xl font-bold text-neutral-700">No posts in this category yet.</h3>
                            <button onClick={() => setFilter(null)} className="text-indigo-600 underline mt-2 text-sm font-bold">Show All Posts</button>
                        </div>
                    ) : latestBlogs.length === 0 && isAllPosts && popularBlogs.length === 0 ? (
                        <div className="text-center py-20">
                            <h3 className="text-xl font-bold text-neutral-700">No posts published yet.</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
                            {latestBlogs.map(blog => (
                                <Link
                                    href={`/blog/${blog.slug}`}
                                    key={blog.id}
                                    className="group grid grid-cols-1 sm:grid-cols-5 gap-6 p-4 rounded-3xl hover:bg-white hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500"
                                >
                                    <div className="sm:col-span-2 aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-neutral-100 relative">
                                        <img
                                            src={blog.payload.images?.bannerImageUrl}
                                            alt={blog.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    </div>
                                    <div className="sm:col-span-3 flex flex-col justify-center py-2">
                                        <div className="flex items-center gap-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">
                                            <span>{blog.category || 'Blog'}</span>
                                            <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                            <span className="text-neutral-400">{formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-neutral-900 mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                                            {blog.title}
                                        </h3>
                                        <p className="text-neutral-500 text-sm line-clamp-2 leading-relaxed">
                                            {blog.payload.meta?.description}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
