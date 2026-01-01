'use server';

import { ai } from '@/ai/genkit';
import { retrieveContext } from '@/lib/rag';
import { z } from 'zod';

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
            return "ระบบยังไม่พบฐานข้อมูลเอกสาร (PDFs) หรือกำลังสร้างดัชนีข้อมูล กรุณาลองใหม่อีกครั้งในอีกสักครู่";
        }

        let languageInstruction = "ตอบเป็นภาษาไทย";
        if (locale.startsWith('en')) {
            languageInstruction = "Answer in English. IMPORTANT: For any specific legal terms, laws, or sensitive legal advice, you MUST provide the original Thai text alongside the English translation (e.g., 'Civil Code (ประมวลกฎหมายแพ่ง)').";
        }
        if (locale.startsWith('zh')) {
            languageInstruction = "Answer in Chinese (Simplified). IMPORTANT: For any specific legal terms, laws, or sensitive legal advice, you MUST provide the original Thai text alongside the Chinese translation.";
        }

        const prompt = `
      คุณคือผู้ช่วยทนายความอัจฉริยะ (AI Legal Advisor) ของ Lawslane
      หน้าที่ของคุณคือการตอบคำถามทางกฎหมายโดยอ้างอิงจากข้อมูลในเอกสารที่แนบมานี้เท่านั้น
      
      --- ข้อมูลอ้างอิง (Context) ---
      ${context}
      ------------------------------
      
      คำถาม: ${question}
      
      คำแนะนำในการตอบ:
      1. ${languageInstruction}
      2. ตอบคำถามโดยใช้ข้อมูลจาก "ข้อมูลอ้างอิง" เท่านั้น
      3. หากข้อมูลใน "ข้อมูลอ้างอิง" ไม่เพียงพอที่จะตอบคำถาม ให้แจ้งผู้ใช้ว่า "ขออภัย ข้อมูลในเอกสารไม่เพียงพอที่จะตอบคำถามนี้" (แปลเป็นภาษาที่เหมาะสม)
      4. อ้างอิงชื่อเอกสารหรือมาตราที่เกี่ยวข้องหากมีในข้อมูล
      5. ใช้ภาษาที่เป็นทางการ สุภาพ และเข้าใจง่าย
      6. หากเป็นคำแนะนำทางกฎหมาย ให้ระบุเสมอว่าเป็น "คำแนะนำเบื้องต้น" และควรปรึกษาทนายความเพื่อความถูกต้อง
      7. **การแนะนำบริการ (สำคัญมาก)**:
         - **ร่างสัญญา/ตรวจสัญญา**: หากผู้ใช้ถามเกี่ยวกับการร่างสัญญา ตรวจสัญญา หรือทำสัญญา (MOU, NDA, สัญญาจ้าง ฯลฯ) ให้แนะนำ "บริการร่างสัญญา" และให้ลิงก์นี้: \`/services/contracts\` (ไม่ต้องแนะนำให้หาทนายทั่วไป)
         - **จดทะเบียนธุรกิจ**: หากผู้ใช้ถามเกี่ยวกับการจดทะเบียนบริษัท ห้างหุ้นส่วน หรือนิติบุคคล ให้แนะนำ "บริการจดทะเบียน" และให้ลิงก์นี้: \`/services/registration\`
         - **ที่ปรึกษา SME/ข้อพิพาทธุรกิจ**: หากผู้ใช้เป็น SME และต้องการคำปรึกษาทั่วไปหรือมีข้อพิพาททางธุรกิจ ให้แนะนำ "ที่ปรึกษา SME" และให้ลิงก์นี้: \`/sme#contact\`
         - **ค้นหาทนายความ**: แนะนำให้ "ค้นหาทนายความ" (\`/lawyers\`) เฉพาะในกรณีที่:
           - ผู้ใช้ระบุเจาะจงว่าต้องการหาทนาย
           - เป็นเรื่อง **การฟ้องร้อง**, **คดีความในศาล**, หรือ **คดีอาญา**
           - เป็นเรื่องซับซ้อนที่ไม่เข้าข่ายบริการข้างต้น
           - **ห้าม** แนะนำให้หาทนายพร่ำเพรื่อในทุกคำตอบ
    `;

        const { text } = await ai.generate(prompt);
        return text;

    } catch (error) {
        console.error('Error generating legal advice:', error);
        if (locale.startsWith('en')) return "Sorry, an error occurred. Please try again.";
        if (locale.startsWith('zh')) return "抱歉，处理时发生错误。请重试。";
        return "ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง";
    }
}
