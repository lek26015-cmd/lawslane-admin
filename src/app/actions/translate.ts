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
        // Escape check: Ensure text doesn't break prompt, though standard string interpolation is usually fine.
        // We removed the quotes around thaiText to avoid breaking on internal quotes.
        const prompt = `You are a professional translator. Translate the following Thai text to English and Chinese (Simplified).

Input Text:
${thaiText}

Instructions:
1. Translate to English.
2. Translate to Chinese (Simplified).
3. Return ONLY a valid JSON object. Do not include markdown formatting (like \`\`\`json).
4. JSON Format: {"english": "...", "chinese": "..."}
`;

        const response = await ai.generate({
            prompt,
            config: {
                temperature: 0.3,
            },
        });

        const text = response.text.trim();
        console.log('AI Response:', text); // Debugging

        // Improved JSON parsing
        try {
            // Remove potential markdown code blocks and whitespace
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('{');
            const end = cleanText.lastIndexOf('}');

            if (start === -1 || end === -1) {
                throw new Error('No JSON object found in response');
            }

            const jsonString = cleanText.substring(start, end + 1);
            const result = JSON.parse(jsonString);

            return {
                english: result.english || '',
                chinese: result.chinese || '',
            };
        } catch (parseError) {
            console.error('Failed to parse translation response:', text, parseError);
            // Fallback: If simple parse fails, try to just extract lines if the LLM failed instructions (unlikely with this prompt but safety net)
            return { english: '', chinese: '' };
        }
    } catch (error) {
        console.error('Translation error:', error);
        throw new Error('Translation failed');
    }
}
