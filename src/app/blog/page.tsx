import { getAllBlogs } from '@/lib/blogDb';
import BlogHubClient from './BlogHubClient';

export const dynamic = 'force-dynamic';

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
    const blogs = await getAllBlogs();
    const { category } = await searchParams;

    // Derive unique categories from published blogs
    const rawCategories = Array.from(new Set(blogs.map(b => b.category).filter(Boolean))) as string[];
    const categories = rawCategories.sort();

    const filtered = category
        ? blogs.filter(b => b.category === category)
        : blogs;

    return <BlogHubClient blogs={filtered} allBlogs={blogs} categories={categories} activeCategory={category || null} />;
}
