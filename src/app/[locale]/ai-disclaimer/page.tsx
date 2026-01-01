'use client';

import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function AiDisclaimerPage() {
    const locale = useLocale();
    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header Section */}
            <div className="bg-gradient-to-b from-primary/10 to-transparent pb-20 pt-16 md:pt-24">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-6 animate-in fade-in zoom-in duration-500">
                            <Bot className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-foreground font-headline mb-4 tracking-tight">
                            ข้อจำกัดความรับผิดของ AI
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            AI Limitation of Liability / AI责任限制
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="container mx-auto px-4 md:px-6 -mt-12 pb-20">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Thai Version */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <span className="text-2xl">🇹🇭</span>
                            <h2 className="text-xl font-bold text-foreground">ภาษาไทย (Thai)</h2>
                        </div>
                        <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                            <p>
                                Lawslane ใช้เทคโนโลยีปัญญาประดิษฐ์ (Artificial Intelligence หรือ AI) เพื่อช่วยในการสืบค้นและสรุปข้อมูลเบื้องต้นทางกฎหมาย เพื่อความสะดวกและรวดเร็วในการเข้าถึงข้อมูลของผู้ใช้งาน อย่างไรก็ตาม การใช้งานระบบ AI ของเรามีข้อจำกัดที่ผู้ใช้งานควรทราบและยอมรับ ดังนี้:
                            </p>

                            <h3 className="text-xl mt-8 mb-4">1. ไม่ใช่คำแนะนำทางกฎหมาย</h3>
                            <p>
                                ข้อมูล บทวิเคราะห์ หรือคำตอบที่ได้รับจากระบบ AI ของ Lawslane <strong>ถือเป็นเพียงข้อมูลทั่วไปเพื่อการศึกษาเบื้องต้นเท่านั้น</strong> ไม่ถือเป็นคำแนะนำทางกฎหมาย การให้คำปรึกษาทางกฎหมาย หรือการสร้างความสัมพันธ์ระหว่างทนายความกับลูกความ ผู้ใช้งานไม่ควรใช้ข้อมูลจาก AI เป็นฐานในการตัดสินใจทางกฎหมาย หรือใช้แทนคำแนะนำจากทนายความผู้มีใบอนุญาตและมีความเชี่ยวชาญเฉพาะด้าน
                            </p>

                            <h3 className="text-xl mt-8 mb-4">2. ความถูกต้องและความทันสมัยของข้อมูล</h3>
                            <p>
                                แม้ว่าเราจะพยายามพัฒนาระบบให้มีความแม่นยำสูงสุด แต่เทคโนโลยี AI อาจเกิดข้อผิดพลาด (Hallucination) หรือให้ข้อมูลที่ไม่ครบถ้วนสมบูรณ์ได้ นอกจากนี้ กฎหมายอาจมีการเปลี่ยนแปลง แก้ไข หรือยกเลิกได้ตลอดเวลา ซึ่งข้อมูลที่ AI ใช้อ้างอิงอาจยังไม่ได้รับการปรับปรุงให้เป็นปัจจุบันที่สุด Lawslane ไม่รับรองหรือรับประกันความถูกต้อง ความสมบูรณ์ หรือความทันสมัยของข้อมูลที่สร้างขึ้นโดย AI
                            </p>

                            <h3 className="text-xl mt-8 mb-4">3. การจำกัดความรับผิด</h3>
                            <p>
                                Lawslane รวมถึงกรรมการ พนักงาน และพันธมิตร จะไม่รับผิดชอบต่อความเสียหายใดๆ ไม่ว่าจะเป็นความเสียหายโดยตรง ความเสียหายทางอ้อม ความเสียหายพิเศษ หรือความเสียหายที่ตามมา ซึ่งเกิดขึ้นจากการที่ผู้ใช้งานนำข้อมูลจาก AI ไปใช้ หรือเชื่อถือข้อมูลดังกล่าวโดยไม่ตรวจสอบกับทนายความผู้เชี่ยวชาญ
                            </p>

                            <h3 className="text-xl mt-8 mb-4">4. คำแนะนำในการใช้งาน</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>ใช้ข้อมูลจาก AI เพื่อทำความเข้าใจเบื้องต้นเกี่ยวกับประเด็นทางกฎหมายเท่านั้น</li>
                                <li>ตรวจสอบข้อมูลความถูกต้องกับแหล่งข้อมูลทางกฎหมายที่เชื่อถือได้เสมอ</li>
                                <li><strong>ปรึกษาทนายความตัวจริง</strong> ผ่านแพลตฟอร์ม Lawslane สำหรับกรณีที่มีความซับซ้อน หรือต้องการดำเนินการทางกฎหมายอย่างเป็นทางการ</li>
                            </ul>
                        </div>
                    </div>

                    {/* English Version */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <span className="text-2xl">🇺🇸</span>
                            <h2 className="text-xl font-bold text-foreground">English</h2>
                        </div>
                        <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                            <p>
                                Lawslane uses Artificial Intelligence (AI) technology to assist in searching and summarizing preliminary legal information for the convenience and speed of user access. However, the use of our AI system has limitations that users should be aware of and accept, as follows:
                            </p>

                            <h3 className="text-xl mt-8 mb-4">1. Not Legal Advice</h3>
                            <p>
                                The information, analysis, or answers received from Lawslane's AI system <strong>are for general educational purposes only</strong>. They do not constitute legal advice, legal consultation, or the establishment of an attorney-client relationship. Users should not use AI-generated information as a basis for legal decisions or as a substitute for advice from a licensed and specialized attorney.
                            </p>

                            <h3 className="text-xl mt-8 mb-4">2. Accuracy and Currency of Information</h3>
                            <p>
                                Although we strive to develop the system to be as accurate as possible, AI technology may produce errors (hallucinations) or provide incomplete information. Additionally, laws may change, be amended, or repealed at any time, and the information referenced by the AI may not be the most current. Lawslane does not guarantee or warrant the accuracy, completeness, or currency of information generated by AI.
                            </p>

                            <h3 className="text-xl mt-8 mb-4">3. Limitation of Liability</h3>
                            <p>
                                Lawslane, including its directors, employees, and partners, shall not be liable for any damages, whether direct, indirect, special, or consequential, arising from users' use of or reliance on AI-generated information without verification by a qualified attorney.
                            </p>

                            <h3 className="text-xl mt-8 mb-4">4. Usage Recommendations</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Use AI information only for preliminary understanding of legal issues</li>
                                <li>Always verify information accuracy with reliable legal sources</li>
                                <li><strong>Consult a real attorney</strong> through the Lawslane platform for complex cases or when formal legal action is required</li>
                            </ul>
                        </div>
                    </div>

                    {/* Chinese Version */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <span className="text-2xl">🇨🇳</span>
                            <h2 className="text-xl font-bold text-foreground">中文 (Chinese)</h2>
                        </div>
                        <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                            <p>
                                Lawslane 使用人工智能 (AI) 技术来帮助搜索和总结初步的法律信息，以便用户快速便捷地获取信息。但是，我们的 AI 系统存在用户应了解并接受的限制，如下所示：
                            </p>

                            <h3 className="text-xl mt-8 mb-4">1. 非法律建议</h3>
                            <p>
                                从 Lawslane AI 系统获得的信息、分析或答案<strong>仅供一般教育目的</strong>。它们不构成法律建议、法律咨询或建立律师-客户关系。用户不应将 AI 生成的信息作为法律决定的依据，也不应将其作为持牌专业律师建议的替代品。
                            </p>

                            <h3 className="text-xl mt-8 mb-4">2. 信息的准确性和时效性</h3>
                            <p>
                                尽管我们努力使系统尽可能准确，但 AI 技术可能会产生错误（幻觉）或提供不完整的信息。此外，法律随时可能发生变化、修订或废除，而 AI 引用的信息可能不是最新的。Lawslane 不保证 AI 生成信息的准确性、完整性或时效性。
                            </p>

                            <h3 className="text-xl mt-8 mb-4">3. 责任限制</h3>
                            <p>
                                Lawslane，包括其董事、员工和合作伙伴，对于用户使用或依赖 AI 生成的信息而未经合格律师核实所造成的任何直接、间接、特殊或后果性损害概不负责。
                            </p>

                            <h3 className="text-xl mt-8 mb-4">4. 使用建议</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>仅使用 AI 信息初步了解法律问题</li>
                                <li>始终通过可靠的法律来源核实信息的准确性</li>
                                <li>对于复杂案件或需要正式法律行动时，请通过 Lawslane 平台<strong>咨询真正的律师</strong></li>
                            </ul>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center space-y-2">
                        <p className="text-blue-800 font-medium m-0">
                            หากท่านต้องการคำแนะนำทางกฎหมายที่ถูกต้อง กรุณาใช้บริการ <Link href={`/${locale}/lawyers`} className="text-blue-600 underline hover:text-blue-800">ค้นหาทนายความ</Link>
                        </p>
                        <p className="text-blue-800 font-medium m-0">
                            For accurate legal advice, please use our <Link href={`/${locale}/lawyers`} className="text-blue-600 underline hover:text-blue-800">Find a Lawyer</Link> service
                        </p>
                        <p className="text-blue-800 font-medium m-0">
                            如需准确的法律建议，请使用我们的 <Link href={`/${locale}/lawyers`} className="text-blue-600 underline hover:text-blue-800">寻找律师</Link> 服务
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
