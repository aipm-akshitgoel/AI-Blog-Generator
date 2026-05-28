import { supabaseServer as supabase } from "@/lib/supabaseServerClient";
import {
  normalizeContentGuidelines,
  parseContentGuidelinesFromDb,
} from "@/lib/contentGuidelines";
import type { BusinessContext, ContentGuidelines } from "@/lib/types/businessContext";

export interface BusinessContextRow {
  id: string;
  platform: "blog" | "linkedin";
  business_name: string;
  business_type: string;
  domain: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  services: string[];
  target_audience: string;
  brand_tone?: string | null;
  positioning: string;
  content_guidelines?: unknown | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

type BusinessContextColumnFlags = {
  platform: boolean;
  domain: boolean;
  brandTone: boolean;
  contentGuidelines: boolean;
};

let columnFlagsCache: BusinessContextColumnFlags | null = null;

function supabaseErrorText(error: { message?: string; details?: string; hint?: string; code?: string } | null): string {
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ").toLowerCase();
}

function isMissingColumnError(
  error: { message?: string; details?: string; hint?: string; code?: string } | null,
  column: string,
): boolean {
  const msg = supabaseErrorText(error);
  const col = column.toLowerCase().replace(/_/g, " ");
  const colUnderscore = column.toLowerCase();
  if (!msg.includes(colUnderscore) && !msg.includes(col)) return false;
  return (
    msg.includes("schema cache") ||
    msg.includes("column") ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    error?.code === "42703" ||
    error?.code === "PGRST204"
  );
}

/** Probe optional columns once per server invocation. */
async function getBusinessContextColumnFlags(): Promise<BusinessContextColumnFlags> {
  if (columnFlagsCache) return columnFlagsCache;

  const flags: BusinessContextColumnFlags = {
    platform: true,
    domain: true,
    brandTone: true,
    contentGuidelines: true,
  };

  for (const [key, column] of [
    ["platform", "platform"],
    ["domain", "domain"],
    ["brandTone", "brand_tone"],
    ["contentGuidelines", "content_guidelines"],
  ] as const) {
    const { error } = await supabase.from("business_context").select(column).limit(0);
    if (error && isMissingColumnError(error, column)) {
      flags[key] = false;
    }
  }

  columnFlagsCache = flags;
  return flags;
}

function businessContextSelectColumns(flags: BusinessContextColumnFlags): string {
  const cols = [
    "id",
    "business_name",
    "business_type",
    "location_city",
    "location_region",
    "location_country",
    "services",
    "target_audience",
    "positioning",
    "confirmed_at",
    "created_at",
    "updated_at",
  ];
  if (flags.platform) cols.splice(1, 0, "platform");
  if (flags.domain) cols.splice(flags.platform ? 5 : 4, 0, "domain");
  if (flags.brandTone) cols.splice(cols.indexOf("target_audience") + 1, 0, "brand_tone");
  if (flags.contentGuidelines) cols.push("content_guidelines");
  return cols.join(", ");
}

function guidelinesToDbValue(g?: ContentGuidelines): Record<string, string[]> | null {
  if (!g) return null;
  const dos = (g.dos ?? []).map((s) => s.trim()).filter(Boolean);
  const donts = (g.donts ?? []).map((s) => s.trim()).filter(Boolean);
  if (!dos.length && !donts.length) return null;
  return { dos, donts };
}

function rowToContext(row: BusinessContextRow): BusinessContext {
  return {
    id: row.id,
    platform: row.platform ?? "blog",
    businessName: row.business_name,
    businessType: row.business_type as BusinessContext["businessType"],
    domain: row.domain ?? undefined,
    location: {
      city: row.location_city ?? undefined,
      region: row.location_region ?? undefined,
      country: row.location_country ?? undefined,
    },
    services: row.services ?? [],
    targetAudience: row.target_audience,
    brandTone: row.brand_tone?.trim() || undefined,
    positioning: row.positioning,
    contentGuidelines: parseContentGuidelinesFromDb(row.content_guidelines),
    confirmedAt: row.confirmed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withInputFields(
  ctx: BusinessContext,
  input?: { brandTone?: string; contentGuidelines?: ContentGuidelines },
): BusinessContext {
  let out = ctx;
  const tone = input?.brandTone?.trim();
  if (tone) out = { ...out, brandTone: tone };
  const guidelines = normalizeContentGuidelines(input?.contentGuidelines);
  if (guidelines) out = { ...out, contentGuidelines: guidelines };
  return out;
}

export async function createBusinessContext(
  data: Omit<BusinessContext, "id" | "createdAt" | "updatedAt">,
  userId: string,
): Promise<BusinessContext> {
  const flags = await getBusinessContextColumnFlags();
  const selectCols = businessContextSelectColumns(flags);

  const insertRow: Record<string, unknown> = {
    user_id: userId,
    business_name: data.businessName,
    business_type: data.businessType,
    location_city: data.location.city || null,
    location_region: data.location.region || null,
    location_country: data.location.country || null,
    services: data.services,
    target_audience: data.targetAudience,
    positioning: data.positioning,
    confirmed_at: new Date().toISOString(),
  };

  if (flags.platform) {
    insertRow.platform = data.platform || "blog";
  }
  if (flags.domain) {
    insertRow.domain = data.domain ? String(data.domain).trim() : null;
  }
  if (flags.brandTone) {
    insertRow.brand_tone = data.brandTone?.trim() || null;
  }
  if (flags.contentGuidelines) {
    insertRow.content_guidelines = guidelinesToDbValue(data.contentGuidelines);
  }

  const { data: row, error } = await supabase
    .from("business_context")
    .insert(insertRow)
    .select(selectCols)
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create business context");
  }

  return withInputFields(rowToContext(row as unknown as BusinessContextRow), {
    brandTone: data.brandTone,
    contentGuidelines: data.contentGuidelines,
  });
}

export async function updateBusinessContext(
  id: string,
  data: Partial<Omit<BusinessContext, "id" | "createdAt" | "updatedAt">>,
): Promise<BusinessContext> {
  const flags = await getBusinessContextColumnFlags();
  const selectCols = businessContextSelectColumns(flags);

  const updateData: Record<string, unknown> = {};
  if (flags.platform && data.platform) updateData.platform = data.platform;
  if (data.businessName) updateData.business_name = data.businessName;
  if (data.businessType) updateData.business_type = data.businessType;
  if (flags.domain && data.domain !== undefined) {
    updateData.domain = data.domain ? String(data.domain).trim() : null;
  }
  if (data.location) {
    updateData.location_city = data.location.city || null;
    updateData.location_region = data.location.region || null;
    updateData.location_country = data.location.country || null;
  }
  if (data.services) updateData.services = data.services;
  if (data.targetAudience) updateData.target_audience = data.targetAudience;
  if (data.positioning) updateData.positioning = data.positioning;
  if (flags.brandTone && data.brandTone !== undefined) {
    updateData.brand_tone = data.brandTone?.trim() || null;
  }
  if (flags.contentGuidelines && data.contentGuidelines !== undefined) {
    updateData.content_guidelines = guidelinesToDbValue(data.contentGuidelines);
  }

  updateData.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from("business_context")
    .update(updateData)
    .eq("id", id)
    .select(selectCols)
    .single();

  if (error) {
    throw new Error(error.message || "Failed to update business context");
  }

  return withInputFields(rowToContext(row as unknown as BusinessContextRow), {
    brandTone: data.brandTone,
    contentGuidelines: data.contentGuidelines,
  });
}

export async function getBusinessContext(id: string): Promise<BusinessContext | null> {
  const flags = await getBusinessContextColumnFlags();
  const { data: row, error } = await supabase
    .from("business_context")
    .select(businessContextSelectColumns(flags))
    .eq("id", id)
    .single();

  if (error || !row) return null;
  return rowToContext(row as unknown as BusinessContextRow);
}

export async function listBusinessContexts(userId?: string, platform?: "blog" | "linkedin"): Promise<BusinessContext[]> {
  const flags = await getBusinessContextColumnFlags();
  let query = supabase
    .from("business_context")
    .select(businessContextSelectColumns(flags))
    .order("updated_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (flags.platform && platform) {
    query = query.eq("platform", platform);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message || "Failed to list business contexts");
  return (rows ?? []).map((r) => rowToContext(r as unknown as BusinessContextRow));
}

export async function deleteBusinessContext(id: string): Promise<void> {
  const { error } = await supabase
    .from("business_context")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message || "Failed to delete business context");
}
