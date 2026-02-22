import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteBlog } from "@/lib/blogDb";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const success = await deleteBlog(resolvedParams.id, userId);

        if (success) {
            return NextResponse.json({ message: "Blog deleted successfully" }, { status: 200 });
        } else {
            return NextResponse.json({ error: "Blog not found or unauthorized" }, { status: 404 });
        }
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
