export interface PublishPayload {
    status: "published" | "draft" | "failed";
    publishUrl?: string;
    publishedAt?: string;
    platform: "Webflow" | "WordPress" | "Sanity" | "Local CMS" | "Draft";
    errorDetails?: string;
}
