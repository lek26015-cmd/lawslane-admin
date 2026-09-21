import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth-guard';

const TranslateSchema = z.object({
    title: z.string(),
    description: z.string(),
    content: z.string(),
    targetLanguage: z.enum(['en', 'zh']),
});

export async function POST(req: NextRequest) {
    // ต้องเป็นแอดมินที่ล็อกอินอยู่จริง — middleware ของแอปนี้เช็คแค่ว่ามี cookie
    // ชื่อ session ไหม (ปลอมได้) และ matcher ก็ไม่ครอบ /api จึงต้องกันที่ route เอง
    try {
        await requireAdmin();
    } catch (e) {
        return authErrorResponse(e);
    }
    try {
        const body = await req.json();
        const { title, description, content, targetLanguage } = TranslateSchema.parse(body);

        const languageName = targetLanguage === 'en' ? 'English' : 'Chinese (Simplified)';

        const prompt = `
      You are a professional legal translator. Translate the following article content from Thai to ${languageName}.
      Maintain the professional tone and legal accuracy.
      
      Input:
      Title: ${title}
      Description: ${description}
      Content: ${content}

      Output JSON format:
      {
        "title": "Translated Title",
        "description": "Translated Description",
        "content": "Translated Content (keep HTML/Markdown formatting if present)"
      }
    `;

        const { text } = await ai.generate({
            prompt: prompt,
            output: {
                schema: z.object({
                    title: z.string(),
                    description: z.string(),
                    content: z.string(),
                }),
            }
        });

        return NextResponse.json(text);

    } catch (error) {
        console.error('Translation error:', error);
        return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
    }
}
