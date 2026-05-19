import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBlogsByUserId } from "@/lib/blogDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const blogs = await getBlogsByUserId(userId);
    return NextResponse.json({ blogs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list blogs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
