'use server';

import { retrieveContext } from '@/lib/rag';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';


const LegalQaInputSchema = z.object({
    question: z.string(),
});

export async function generateLegalAdvice(question: string, locale: string = 'th') {
    try {
        // Retrieve relevant context using RAG
        const context = await retrieveContext(question);

        if (!context || context.trim() === '') {
            if (locale.startsWith('en')) return "System could not find relevant legal documents (PDFs) or is indexing. Please try again later.";
            if (locale.startsWith('zh')) return "系统找不到相关的法律文件（PDF）或正在建立索引。请稍后再试。";
            return "ระบบยังไม่พบฐานข้อมูลเอกสารกฎหมาย (PDF) ที่เกี่ยวข้อง หรือกำลังจัดทำดัชนี กรุณาลองใหม่อีกครั้งในภายหลัง";
        }

        let languageInstruction = "ตอบเป็นภาษาไทย";
        if (locale.startsWith('en')) {
            languageInstruction = "Answer in English (Thai reference for legal terms).";
        } else if (locale.startsWith('zh')) {
            languageInstruction = "Answer in Chinese (Thai reference for legal terms).";
        }

        const prompt = `You are LAlin, an AI Legal Advisor for Lawslane.
Task: Answer legal questions using ONLY the provided context. If insufficient, say "ขออภัย ข้อมูลในเอกสารไม่เพียงพอที่จะตอบคำถามนี้".

--- Context ---
${context}
---------------

Question: ${question}

Rules:
1. ${languageInstruction}
2. Be formal, polite, and clear.
3. Cite sources/articles from context.
4. Always state: "คำแนะนำเบื้องต้น ควรปรึกษาทนายความเพื่อความถูกต้อง".
5. Service Links Strategy:
   - **Contract Services**: For contract drafting/review (MOU, NDA, Employment, etc.), recommend "/services/contracts".
   - **Business Registration**: for company setup, recommend "/services/registration".
   - **SME/B2B Advisory**: for general business legal support, recommend "/b2b#contact".
   - **Find a Lawyer**: recommend "/lawyers" ONLY for court litigation, criminal cases, or highly complex disputes.
`;

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
        if (!apiKey) throw new Error("API Key not found");
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



        const result = await model.generateContent(prompt);
        const finalResult = result.response.text();



        return finalResult;

    } catch (error) {
        console.error('Error generating legal advice:', error);
        if (locale.startsWith('en')) return "Sorry, an error occurred. Please try again.";
        if (locale.startsWith('zh')) return "抱歉，处理时发生错误。请重试。";
        return "ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง";
    }
}
