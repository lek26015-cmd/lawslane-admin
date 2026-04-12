/**
 * Cloudflare Images utility to handle variants
 */

export type CloudflareVariant = 'public' | 'avatar' | 'thumbnail' | 'large' | 'banner';

/**
 * Transforms a Cloudflare Image URL to use a specific variant.
 * Cloudflare URL pattern: https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>
 * 
 * @param url The original Cloudflare Image URL
 * @param variant The desired variant name
 * @returns The transformed URL or the original if not a Cloudflare URL
 */
export function getCloudflareVariantUrl(url: string | undefined | null, variant: CloudflareVariant = 'public'): string {
    if (!url) return '';
    
    // Check if it's a Cloudflare Image URL
    if (url.includes('imagedelivery.net')) {
        const parts = url.split('/');
        // If it has at least 5 parts (protocol, empty, domain, hash, id, variant)
        if (parts.length >= 5) {
            // Replace the last part (variant) with the requested one
            // If the URL ends with a slash or doesn't have a variant, we might need more logic
            // But based on upload-cloudflare-images.ts, it returns a URL with a variant
            parts[parts.length - 1] = variant;
            return parts.join('/');
        }
    }
    
    return url || '';
}
