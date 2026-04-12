'use server';

import { uploadToCloudflareImages } from '@/app/actions/upload-cloudflare-images';

/**
 * @deprecated DO NOT USE — R2 public storage is permanently disabled for security.
 * All uploads now route through Cloudflare Images (private, CDN-backed).
 */
export async function uploadToR2(formData: FormData, folder: string = 'uploads') {
    console.warn(`[SECURITY] uploadToR2 called with folder="${folder}" — redirecting to Cloudflare Images`);
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }
    return await uploadToCloudflareImages(formData);
}
