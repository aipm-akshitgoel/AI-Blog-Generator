#!/usr/bin/env node
/**
 * Wipes all Bloggie AI user data in production:
 * - Supabase: blogs, business_context (cascades strategy_sessions), feedbacks
 * - Clerk: deletes every user in the Clerk instance
 *
 * Usage (production keys only):
 *   CONFIRM_PROD_RESET=DELETE_ALL_BLOGGIE_USERS node scripts/reset-prod-users.mjs
 *
 * Loads .env.local if present (Next does not auto-load for node scripts).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CONFIRM = process.env.CONFIRM_PROD_RESET;
const REQUIRED_CONFIRM = "DELETE_ALL_BLOGGIE_USERS";

function loadEnvLocal() {
    const path = resolve(process.cwd(), ".env.local");
    if (!existsSync(path)) return;
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq < 1) continue;
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
    }
}

async function clerkListUsers(secretKey, offset = 0) {
    const url = new URL("https://api.clerk.com/v1/users");
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Clerk list users failed (${res.status}): ${body}`);
    }
    return res.json();
}

async function clerkDeleteUser(secretKey, userId) {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!res.ok && res.status !== 404) {
        const body = await res.text();
        throw new Error(`Clerk delete ${userId} failed (${res.status}): ${body}`);
    }
}

async function deleteAllClerkUsers(secretKey) {
    let offset = 0;
    let deleted = 0;
    for (;;) {
        const batch = await clerkListUsers(secretKey, offset);
        const users = Array.isArray(batch) ? batch : batch?.data ?? [];
        if (users.length === 0) break;
        for (const u of users) {
            if (u?.id) {
                await clerkDeleteUser(secretKey, u.id);
                deleted++;
                const email = u.email_addresses?.[0]?.email_address ?? u.id;
                console.log(`  Clerk deleted: ${email}`);
            }
        }
        if (users.length < 100) break;
        offset += users.length;
    }
    return deleted;
}

async function supabaseDeleteAll(supabase, table, filterColumn) {
    const { error, count } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .not(filterColumn, "is", null);
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
}

async function main() {
    if (CONFIRM !== REQUIRED_CONFIRM) {
        console.error(
            `Refusing to run. Set CONFIRM_PROD_RESET=${REQUIRED_CONFIRM} to wipe production users and data.`,
        );
        process.exit(1);
    }

    loadEnvLocal();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const clerkSecret = process.env.CLERK_SECRET_KEY?.trim();

    if (!supabaseUrl || !serviceKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        process.exit(1);
    }
    if (!clerkSecret) {
        console.error("Missing CLERK_SECRET_KEY");
        process.exit(1);
    }

    let host = supabaseUrl;
    try {
        host = new URL(supabaseUrl).hostname;
    } catch {
        /* keep raw */
    }

    console.log("\n⚠️  PRODUCTION RESET — Bloggie AI");
    console.log(`   Supabase: ${host}`);
    console.log("   Clerk: all users in this Clerk application\n");

    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("Clearing Supabase…");
    let blogs = 0;
    let contexts = 0;
    let feedbacks = 0;

    try {
        blogs = await supabaseDeleteAll(supabase, "blogs", "user_id");
        console.log(`  blogs: ${blogs} rows removed`);
    } catch (e) {
        console.warn(`  blogs: ${e.message}`);
    }

    try {
        contexts = await supabaseDeleteAll(supabase, "business_context", "id");
        console.log(`  business_context (+ strategy_sessions cascade): ${contexts} rows removed`);
    } catch (e) {
        console.warn(`  business_context: ${e.message}`);
    }

    try {
        feedbacks = await supabaseDeleteAll(supabase, "feedbacks", "blog_id");
        console.log(`  feedbacks: ${feedbacks} rows removed`);
    } catch (e) {
        console.warn(`  feedbacks: skipped (${e.message})`);
    }

    console.log("\nDeleting Clerk users…");
    const clerkDeleted = await deleteAllClerkUsers(clerkSecret);
    console.log(`  Clerk: ${clerkDeleted} users deleted`);

    console.log("\nDone. Users can sign up again and run the new onboarding flow.\n");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
