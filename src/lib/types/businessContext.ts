/**
 * Canonical Business Context — output of the Business Context Agent.
 * Used for salons, spas, barbershops (beauty & wellness).
 */
export type BusinessType = "salon" | "spa" | "barbershop" | "other";

export interface BusinessContextLocation {
  city?: string;
  region?: string;
  country?: string;
}

export interface BusinessContext {
  id?: string;
  businessName: string;
  businessType: BusinessType;
  location: BusinessContextLocation;
  services: string[];
  targetAudience: string;
  positioning: string;
  confirmedAt?: string; // ISO timestamp when user confirmed
  createdAt?: string;
  updatedAt?: string;
}

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "salon", label: "Salon" },
  { value: "spa", label: "Spa" },
  { value: "barbershop", label: "Barbershop" },
  { value: "other", label: "Other" },
];
