import "server-only";
import { supabaseServer as supabase } from "@/lib/supabaseServerClient";
import { listBusinessContexts } from "@/lib/businessContextDb";

export type DeleteUserDataSummary = {
    blogsDeleted: number;
    strategySessionsDeleted: number;
    businessContextsDeleted: number;
};

/**
 * Removes all Supabase rows scoped to a Clerk user id.
 * Clerk user deletion is handled separately in /api/user/delete.
 */
export async function deleteAllUserData(userId: string): Promise<DeleteUserDataSummary> {
    const contexts = await listBusinessContexts(userId);
    const contextIds = contexts.map((c) => c.id).filter((id): id is string => Boolean(id));

    let strategySessionsDeleted = 0;
    if (contextIds.length > 0) {
        const { error: strategyError, count: strategyCount } = await supabase
            .from("strategy_sessions")
            .delete({ count: "exact" })
            .in("business_context_id", contextIds);
        if (strategyError) {
            throw new Error(strategyError.message || "Failed to delete strategy sessions");
        }
        strategySessionsDeleted = strategyCount ?? 0;
    }

    const { error: blogsError, count: blogsCount } = await supabase
        .from("blogs")
        .delete({ count: "exact" })
        .eq("user_id", userId);
    if (blogsError) {
        throw new Error(blogsError.message || "Failed to delete blogs");
    }

    const { error: contextError, count: contextCount } = await supabase
        .from("business_context")
        .delete({ count: "exact" })
        .eq("user_id", userId);
    if (contextError) {
        throw new Error(contextError.message || "Failed to delete business context");
    }

    return {
        blogsDeleted: blogsCount ?? 0,
        strategySessionsDeleted,
        businessContextsDeleted: contextCount ?? 0,
    };
}
