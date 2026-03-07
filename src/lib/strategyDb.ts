import { supabase } from "@/lib/supabaseClient";
import type { StrategySession, KeywordStrategy, TopicOption } from "@/lib/types/strategy";

export interface StrategySessionRow {
    id: string;
    platform: "blog" | "linkedin";
    business_context_id: string;
    keyword_strategy: any;
    topic_options: any[];
    trending_topics?: string[];
    inspiration?: any[];
    status: string;
    created_at: string;
}

function rowToSession(row: StrategySessionRow): StrategySession {
    return {
        id: row.id,
        platform: row.platform,
        businessContextId: row.business_context_id,
        keywordStrategy: row.keyword_strategy as KeywordStrategy,
        topicOptions: row.topic_options as TopicOption[],
        trendingTopics: row.trending_topics,
        inspiration: row.inspiration,
        status: row.status as StrategySession["status"],
        createdAt: row.created_at,
    };
}

export async function createStrategySession(
    data: StrategySession
): Promise<StrategySession> {
    const payload: any = {
        business_context_id: data.businessContextId,
        platform: data.platform || "blog",
        keyword_strategy: data.keywordStrategy,
        topic_options: data.topicOptions,
        status: data.status,
    };
    if (data.trendingTopics) payload.trending_topics = data.trendingTopics;
    if (data.inspiration) payload.inspiration = data.inspiration;

    // If an ID is provided, update (upsert). This supports the singleton "edit" flow.
    if (data.id) {
        const { data: row, error } = await supabase
            .from("strategy_sessions")
            .update(payload)
            .eq("id", data.id)
            .select()
            .single();
        if (error) throw new Error(error.message || "Failed to update strategy session");
        return rowToSession(row as StrategySessionRow);
    }

    // No ID: insert a fresh row
    const { data: row, error } = await supabase
        .from("strategy_sessions")
        .insert(payload)
        .select()
        .single();

    if (error) throw new Error(error.message || "Failed to create strategy session");
    return rowToSession(row as StrategySessionRow);
}

export async function getLatestStrategySession(businessContextId?: string, platform?: "blog" | "linkedin"): Promise<StrategySession | null> {
    let query = supabase
        .from("strategy_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

    if (businessContextId) {
        query = query.eq("business_context_id", businessContextId);
    }

    if (platform) {
        query = query.eq("platform", platform);
    }

    const { data: rows, error } = await query;

    if (error || !rows || rows.length === 0) return null;
    return rowToSession(rows[0] as StrategySessionRow);
}

export async function listStrategySessions(businessContextId: string, platform?: "blog" | "linkedin"): Promise<StrategySession[]> {
    let query = supabase
        .from("strategy_sessions")
        .select("*")
        .eq("business_context_id", businessContextId)
        .order("created_at", { ascending: false });

    if (platform) {
        query = query.eq("platform", platform);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message || "Failed to list strategy sessions");
    return (rows ?? []).map((r) => rowToSession(r as StrategySessionRow));
}

export async function deleteStrategySession(id: string): Promise<void> {
    const { error } = await supabase
        .from("strategy_sessions")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message || "Failed to delete strategy session");
}
