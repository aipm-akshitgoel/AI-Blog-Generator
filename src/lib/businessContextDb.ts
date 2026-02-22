import { supabase } from "@/lib/supabaseClient";
import type { BusinessContext } from "@/lib/types/businessContext";

export interface BusinessContextRow {
  id: string;
  business_name: string;
  business_type: string;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  services: string[];
  target_audience: string;
  positioning: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToContext(row: BusinessContextRow): BusinessContext {
  return {
    id: row.id,
    businessName: row.business_name,
    businessType: row.business_type as BusinessContext["businessType"],
    location: {
      city: row.location_city ?? undefined,
      region: row.location_region ?? undefined,
      country: row.location_country ?? undefined,
    },
    services: row.services ?? [],
    targetAudience: row.target_audience,
    positioning: row.positioning,
    confirmedAt: row.confirmed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBusinessContext(
  data: Omit<BusinessContext, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<BusinessContext> {
  const { data: row, error } = await supabase
    .from("business_context")
    .insert({
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
    })
    .select()
    .single();

  if (error) throw error;
  return rowToContext(row as BusinessContextRow);
}

export async function updateBusinessContext(
  id: string,
  data: Partial<Omit<BusinessContext, "id" | "createdAt" | "updatedAt">>
): Promise<BusinessContext> {
  const updateData: any = {};
  if (data.businessName) updateData.business_name = data.businessName;
  if (data.businessType) updateData.business_type = data.businessType;
  if (data.location) {
    updateData.location_city = data.location.city || null;
    updateData.location_region = data.location.region || null;
    updateData.location_country = data.location.country || null;
  }
  if (data.services) updateData.services = data.services;
  if (data.targetAudience) updateData.target_audience = data.targetAudience;
  if (data.positioning) updateData.positioning = data.positioning;

  updateData.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from("business_context")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToContext(row as BusinessContextRow);
}

export async function getBusinessContext(id: string): Promise<BusinessContext | null> {
  const { data: row, error } = await supabase
    .from("business_context")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) return null;
  return rowToContext(row as BusinessContextRow);
}

export async function listBusinessContexts(userId?: string): Promise<BusinessContext[]> {
  let query = supabase
    .from("business_context")
    .select("*")
    .order("updated_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: rows, error } = await query;
  if (error) throw error;
  return (rows ?? []).map((r) => rowToContext(r as BusinessContextRow));
}

export async function deleteBusinessContext(id: string): Promise<void> {
  const { error } = await supabase
    .from("business_context")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
