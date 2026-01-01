'use server';

import { ai } from '@/ai/genkit';

export interface TranslationResult {
    english: string;
    chinese: string;
}

export async function translateToMultipleLanguages(
    thaiText: string
): Promise<TranslationResult> {
    if (!thaiText || thaiText.trim().length === 0) {
        return { english: '', chinese: '' };
    }

    try {
        const prompt = `You are a professional translator. Translate the following Thai text to English and Chinese (Simplified).

Thai text: "${thaiText}"

Return ONLY a JSON object in this exact format, no markdown, no explanation:
{"english": "translation in English", "chinese": "translation in Simplified Chinese"}`;

        const response = await ai.generate({
            prompt,
            config: {
                temperature: 0.3,
            },
        });

        const text = response.text.trim();

        // Try to parse as JSON
        try {
            // Remove markdown code blocks if present
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleanText);
            return {
                english: result.english || '',
                chinese: result.chinese || '',
            };
        } catch {
            // If parsing fails, return empty
            console.error('Failed to parse translation response:', text);
            return { english: '', chinese: '' };
        }
    } catch (error) {
        console.error('Translation error:', error);
        throw new Error('Translation failed');
    }
}
