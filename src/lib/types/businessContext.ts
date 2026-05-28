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

export interface SeoDefaults {
  defaultPostCategory?: string;
  defaultSchemaType?: "Article" | "BlogPosting";
  includeFaqSchemaByDefault?: boolean;
  canonicalBaseUrl?: string;
}

/** Account-wide rules injected into blog writing and optimization prompts. */
export interface ContentGuidelines {
  /** One rule per entry — e.g. "Cite UGC, AICTE, or university official pages for accreditation claims". */
  dos?: string[];
  /** One rule per entry — e.g. "Do not name or link to competitor aggregators". */
  donts?: string[];
}

export interface BusinessContext {
  id?: string;
  platform?: "blog" | "linkedin";
  businessName: string;
  domain?: string;
  businessType: BusinessType;
  location: BusinessContextLocation;
  services: string[];
  targetAudience: string;
  /** Voice/style (e.g. authoritative, friendly). Distinct from positioning. */
  brandTone?: string;
  positioning: string;
  internalLinks?: { href: string; anchorText: string; target: "blog" | "service" | "page" }[];
  integrations?: IntegrationCredentials;
  seoDefaults?: SeoDefaults;
  /** Domain-level Do's and Don'ts for all blog posts on this account. */
  contentGuidelines?: ContentGuidelines;
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
