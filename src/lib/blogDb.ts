import { supabase } from "@/lib/supabaseClient";
import type { PublishPayload } from "@/lib/types/publish";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { CTAData } from "@/lib/types/cta";
import type { ImageMetadata } from "@/lib/types/image";
import type { MetaOption } from "@/lib/types/meta";
import type { SchemaData } from "@/lib/types/schema";

// Drop-in Supabase replacement for the old file-based mockDb.ts
// Table: blogs
// Schema: id text pk, user_id text, status text, title text, slug text,
//         created_at timestamptz, template_id text, live_url text,
//         category text, payload jsonb

export interface SavedBlog {
    id: string;
    userId: string;
    status: PublishPayload["status"];
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
    };
}

function rowToBlog(row: any): SavedBlog {
    return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        title: row.title,
        slug: row.slug,
        createdAt: row.created_at,
        templateId: row.template_id ?? undefined,
        liveUrl: row.live_url ?? undefined,
        category: row.category ?? undefined,
        payload: row.payload,
    };
}

export async function getBlogsByUserId(userId: string): Promise<SavedBlog[]> {
    const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToBlog);
}

export async function getBlogById(id: string, userId: string): Promise<SavedBlog | null> {
    const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();
    if (error || !data) return null;
    return rowToBlog(data);
}

export async function getAllBlogs(): Promise<SavedBlog[]> {
    const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToBlog);
}

export async function getBlogBySlug(slug: string): Promise<SavedBlog | null> {
    const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .single();
    if (error || !data) return null;
    return rowToBlog(data);
}

export async function saveBlog(blog: SavedBlog): Promise<void> {
    const row = {
        id: blog.id,
        user_id: blog.userId,
        status: blog.status,
        title: blog.title,
        slug: blog.slug,
        created_at: blog.createdAt,
        template_id: blog.templateId ?? null,
        live_url: blog.liveUrl ?? null,
        category: blog.category ?? null,
        payload: blog.payload,
    };

    const { error } = await supabase
        .from("blogs")
        .upsert(row, { onConflict: "id" });
    if (error) throw error;
}

export async function deleteBlog(id: string, userId: string): Promise<boolean> {
    const { error, count } = await supabase
        .from("blogs")
        .delete({ count: "exact" })
        .eq("id", id)
        .eq("user_id", userId);
    if (error) throw error;
    return (count ?? 0) > 0;
}
