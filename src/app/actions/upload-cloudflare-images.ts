'use server';

export async function uploadToCloudflareImages(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }

    const accountId = process.env.R2_ACCOUNT_ID; // Cloudflare Account ID is the same as R2
    const apiToken = process.env.CLOUDFLARE_IMAGES_TOKEN;

    if (!accountId || !apiToken) {
        console.error("Missing Cloudflare Images configuration");
        throw new Error('Cloudflare Images not configured. Please add CLOUDFLARE_IMAGES_TOKEN to .env.local');
    }

    try {
        console.log(`[Server Action] Uploading to Cloudflare Images...`);

        const cfFormData = new FormData();
        cfFormData.append('file', file);
        // Metadata can be added here if needed
        // cfFormData.append('metadata', JSON.stringify({ key: 'value' }));

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                },
                body: cfFormData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Cloudflare Images Upload Error:", errorData);
            throw new Error(errorData.errors?.[0]?.message || 'Failed to upload to Cloudflare Images');
        }

        const data = await response.json();
        const imageId = data.result.id;
        
        // Return the first delivery URL (usually the 'public' variant)
        // Cloudflare Images format: https://imagedelivery.net/<hash>/<id>/<variant>
        const variants = data.result.variants || [];
        const publicUrl = variants.length > 0 ? variants[0] : null;

        if (!publicUrl) {
            throw new Error('No delivery variants found for uploaded image');
        }

        console.log(`[Server Action] Cloudflare Images upload success: ${publicUrl}`);
        return publicUrl;

    } catch (error: any) {
        console.error("Cloudflare Images Upload Error:", error);
        throw new Error(error.message || 'Failed to upload to Cloudflare Images');
    }
}
