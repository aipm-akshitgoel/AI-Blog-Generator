import { supabase } from "@/lib/supabaseClient";
import type { StrategySession, KeywordStrategy, TopicOption } from "@/lib/types/strategy";

export interface StrategySessionRow {
    id: string;
    business_context_id: string;
    keyword_strategy: any;
    topic_options: any[];
    status: string;
    created_at: string;
}

function rowToSession(row: StrategySessionRow): StrategySession {
    return {
        id: row.id,
        businessContextId: row.business_context_id,
        keywordStrategy: row.keyword_strategy as KeywordStrategy,
        topicOptions: row.topic_options as TopicOption[],
        status: row.status as StrategySession["status"],
        createdAt: row.created_at,
    };
}

export async function createStrategySession(
    data: StrategySession
): Promise<StrategySession> {
    // If an ID is provided, update (upsert). This supports the singleton "edit" flow.
    if (data.id) {
        const { data: row, error } = await supabase
            .from("strategy_sessions")
            .update({
                keyword_strategy: data.keywordStrategy,
                topic_options: data.topicOptions,
                status: data.status,
            })
            .eq("id", data.id)
            .select()
            .single();
        if (error) throw error;
        return rowToSession(row as StrategySessionRow);
    }

    // No ID: insert a fresh row
    const { data: row, error } = await supabase
        .from("strategy_sessions")
        .insert({
            business_context_id: data.businessContextId,
            keyword_strategy: data.keywordStrategy,
            topic_options: data.topicOptions,
            status: data.status,
        })
        .select()
        .single();

    if (error) throw error;
    return rowToSession(row as StrategySessionRow);
}

export async function getLatestStrategySession(businessContextId?: string): Promise<StrategySession | null> {
    let query = supabase
        .from("strategy_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

    if (businessContextId) {
        query = query.eq("business_context_id", businessContextId);
    }

    const { data: rows, error } = await query;

    if (error || !rows || rows.length === 0) return null;
    return rowToSession(rows[0] as StrategySessionRow);
}

export async function listStrategySessions(businessContextId: string): Promise<StrategySession[]> {
    const { data: rows, error } = await supabase
        .from("strategy_sessions")
        .select("*")
        .eq("business_context_id", businessContextId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (rows ?? []).map((r) => rowToSession(r as StrategySessionRow));
}

export async function deleteStrategySession(id: string): Promise<void> {
    const { error } = await supabase
        .from("strategy_sessions")
        .delete()
        .eq("id", id);

    if (error) throw error;
}
