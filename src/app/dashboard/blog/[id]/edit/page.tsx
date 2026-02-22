import { auth } from "@clerk/nextjs/server";
import { getBlogById } from "@/lib/mockDb";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EditBlogClient } from "@/components/EditBlogClient";

export const dynamic = 'force-dynamic';

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) {
        redirect("/");
    }

    const resolvedParams = await params;
    const blog = await getBlogById(resolvedParams.id, userId);

    if (!blog) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
                <Link href="/dashboard" className="text-indigo-400 hover:underline">Return to Dashboard</Link>
            </div>
        );
    }

    return <EditBlogClient blog={blog} />;
}
