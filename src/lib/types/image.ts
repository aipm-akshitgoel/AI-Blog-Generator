export interface ImageMetadata {
    bannerImageUrl: string;
    ctaImageUrl?: string;
    altText: string;
}

export interface PostWithImages {
    images: ImageMetadata;
}
