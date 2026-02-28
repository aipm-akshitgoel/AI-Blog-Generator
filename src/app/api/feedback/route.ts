import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { blog_id, blog_title, user_email, overall_rating, content_score, content_feedback, seo_score, seo_feedback, agent_feedback } = body;

        if (!blog_id || !user_email || !overall_rating) {
            return NextResponse.json({ error: "Missing required fields (blog_id, user_email, overall_rating)" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("feedbacks")
            .insert([
                {
                    blog_id,
                    blog_title,
                    user_email,
                    overall_rating,
                    content_score,
                    content_feedback,
                    seo_score,
                    seo_feedback,
                    agent_feedback
                }
            ]);

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err: any) {
        console.error("Feedback API error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
