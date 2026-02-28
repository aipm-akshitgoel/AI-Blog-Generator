/**
 * Canonical Business Context — output of the Business Context Agent.
 * Used for salons, spas, barbershops (beauty & wellness).
 */
export type BusinessType = string;

export interface BusinessContextLocation {
  city?: string;
  region?: string;
  country?: string;
}

/** Third-party integration credentials (all optional — collected in setup) */
export interface IntegrationCredentials {
  /** Google Search Console property URL e.g. "https://www.yoursalon.com/" */
  gscPropertyUrl?: string;
  /** Google Analytics 4 Measurement ID e.g. "G-XXXXXXXXXX" */
  ga4MeasurementId?: string;
  /** CRM webhook URL or MCP endpoint for lead syncing */
  crmWebhookUrl?: string;
}

export interface BusinessContext {
  id?: string;
  businessName: string;
  domain?: string;
  businessType: BusinessType;
  location: BusinessContextLocation;
  services: string[];
  targetAudience: string;
  positioning: string;
  internalLinks?: { href: string; anchorText: string; target: "blog" | "service" | "page" }[];
  integrations?: IntegrationCredentials;
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
