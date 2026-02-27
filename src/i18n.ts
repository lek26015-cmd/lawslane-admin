import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Ensure that a valid locale is used
    if (!locale || !['th', 'en', 'zh'].includes(locale)) {
        console.log(`[i18n] No valid locale found, defaulting to th. Original: ${locale}`);
        locale = 'th';
    }

    console.log(`[i18n] Loading messages for locale: ${locale}`);

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
