export interface CTAData {
    ctaHeadline?: string;
    ctaCopy: string;
    ctaButtonText?: string;
    ctaLink: string;
    ctaImageUrl?: string;
}

export interface PostWithCTA {
    // We extend the optimized content with CTA data
    cta: CTAData;
}
