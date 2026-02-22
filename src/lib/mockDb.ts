import fs from 'fs/promises';
import path from 'path';
import type { PublishPayload } from '@/lib/types/publish';
import type { OptimizedContent } from '@/lib/types/optimization';
import type { CTAData } from '@/lib/types/cta';
import type { ImageMetadata } from '@/lib/types/image';
import type { MetaOption } from '@/lib/types/meta';
import type { SchemaData } from '@/lib/types/schema';

// This file simulates a Supabase database instance locally by reading/writing to a JSON file.

export interface SavedBlog {
    id: string;
    userId: string;
    status: PublishPayload['status'];
    title: string;
    slug: string;
    createdAt: string;
    templateId?: string;
    liveUrl?: string;
    category?: string;
    payload: {
        content: OptimizedContent;
        cta: CTAData;
        images: ImageMetadata;
        meta: MetaOption;
        schema: SchemaData;
    }
}

const DB_PATH = path.join(process.cwd(), 'data', 'mock_db.json');

// Ensure DB file exists
async function initDb() {
    try {
        await fs.access(DB_PATH);
    } catch {
        // Create directory if it doesn't exist
        const dir = path.dirname(DB_PATH);
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (e) { /* ignore */ }

        // Initialize empty array
        await fs.writeFile(DB_PATH, JSON.stringify([]));
    }
}

export async function getBlogsByUserId(userId: string): Promise<SavedBlog[]> {
    await initDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const blogs: SavedBlog[] = JSON.parse(data);
    return blogs.filter(b => b.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getBlogById(id: string, userId: string): Promise<SavedBlog | null> {
    await initDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const blogs: SavedBlog[] = JSON.parse(data);
    return blogs.find(b => b.id === id && b.userId === userId) || null;
}

export async function getAllBlogs(): Promise<SavedBlog[]> {
    await initDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const blogs: SavedBlog[] = JSON.parse(data);
    return blogs.filter(b => b.status === "published").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveBlog(blog: SavedBlog): Promise<void> {
    await initDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const blogs: SavedBlog[] = JSON.parse(data);

    // Check if updating or inserting
    const index = blogs.findIndex(b => b.id === blog.id);
    if (index >= 0) {
        blogs[index] = blog;
    } else {
        blogs.push(blog);
    }

    await fs.writeFile(DB_PATH, JSON.stringify(blogs, null, 2));
}

export async function deleteBlog(id: string, userId: string): Promise<boolean> {
    await initDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    let blogs: SavedBlog[] = JSON.parse(data);

    const initialLength = blogs.length;
    blogs = blogs.filter(b => !(b.id === id && b.userId === userId));

    if (blogs.length < initialLength) {
        await fs.writeFile(DB_PATH, JSON.stringify(blogs, null, 2));
        return true;
    }
    return false;
}

export async function getBlogBySlug(slug: string): Promise<SavedBlog | null> {
    await initDb();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const blogs: SavedBlog[] = JSON.parse(data);
    return blogs.find(b => b.slug === slug) || null;
}
