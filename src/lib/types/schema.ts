export interface SchemaData {
    type: string; // e.g., "Article", "BlogPosting", "FAQPage"
    jsonLd: string; // The generated JSON-LD string
    validationStatus: "valid" | "warning" | "error";
    validationMessages?: string[]; // Warnings or errors from simulated validation
}
