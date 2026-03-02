'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export async function translateLegalContent(content: string, targetLanguage: 'en' | 'zh') {
    const languageName = targetLanguage === 'en' ? 'English' : 'Chinese (Simplified)';

    const prompt = `
      You are a professional legal translator. Translate the following HTML content from Thai to ${languageName}.
      Maintain the professional tone and legal accuracy. 
      CRITICAL: Preserve the HTML structure, tags (like <h2>, <p>, <ul>, <li>, <strong>, <a>), and formatting exactly. Only translate the text content inside the tags.
      
      Input HTML:
      ${content}
    `;

    try {
        const { output } = await ai.generate({
            prompt,
            output: {
                schema: z.object({
                    translatedContent: z.string().describe("The translated HTML content")
                })
            }
        });

        return output?.translatedContent || null;
    } catch (error) {
        console.error('Translation error:', error);
        throw new Error('Failed to translate content');
    }
}
