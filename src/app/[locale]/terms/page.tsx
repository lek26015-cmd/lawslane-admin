'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function TermsOfServicePage() {
  const [loading, setLoading] = useState(true);
  const locale = useLocale();

  useEffect(() => {
    // Simulate loading for consistency
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent pb-20 pt-16 md:pt-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-6 animate-in fade-in zoom-in duration-500">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground font-headline mb-4 tracking-tight">
              ข้อกำหนดและเงื่อนไขการใช้บริการ
            </h1>
            <p className="text-lg text-muted-foreground">
              Terms of Service / 服务条款
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 md:px-6 -mt-12 pb-20">
        <div className="max-w-4xl mx-auto space-y-8">

          {loading ? (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thai Version */}
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                  <span className="text-2xl">🇹🇭</span>
                  <h2 className="text-xl font-bold text-foreground">ภาษาไทย (Thai)</h2>
                </div>
                <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                  <p>
                    ยินดีต้อนรับสู่ Lawslane ("บริการ") โปรดอ่านข้อกำหนดและเงื่อนไขการใช้บริการเหล่านี้ ("ข้อกำหนด") อย่างละเอียดก่อนใช้บริการที่ดำเนินการโดยเรา
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">1. การยอมรับข้อกำหนด</h3>
                  <p>
                    โดยการเข้าถึงหรือใช้บริการ คุณตกลงที่จะผูกพันตามข้อกำหนดเหล่านี้ หากคุณไม่ยอมรับส่วนหนึ่งส่วนใดของข้อกำหนด คุณจะไม่สามารถเข้าถึงบริการได้
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">2. บัญชีผู้ใช้</h3>
                  <p>
                    เมื่อคุณสร้างบัญชีกับเรา คุณต้องให้ข้อมูลที่ถูกต้อง ครบถ้วน และเป็นปัจจุบันอยู่เสมอ การไม่ทำเช่นนั้นถือเป็นการละเมิดข้อกำหนด ซึ่งอาจส่งผลให้มีการยุติบัญชีของคุณในบริการของเราทันที
                  </p>
                  <p>
                    คุณมีหน้าที่รับผิดชอบในการรักษารหัสผ่านที่คุณใช้ในการเข้าถึงบริการและสำหรับกิจกรรมหรือการกระทำใดๆ ภายใต้รหัสผ่านของคุณ
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">3. ข้อจำกัดความรับผิด</h3>
                  <p>
                    บริการนี้จัดทำขึ้น "ตามสภาพ" และ "ตามที่มี" การให้คำปรึกษาเบื้องต้นผ่าน AI เป็นเพียงข้อมูลเพื่อประกอบการตัดสินใจ ไม่สามารถใช้แทนคำแนะนำทางกฎหมายจากทนายความผู้เชี่ยวชาญได้ Lawslane จะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดขึ้นจากการใช้ข้อมูลจากบริการของเรา
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">4. การยุติการให้บริการ</h3>
                  <p>
                    เราอาจยุติหรือระงับการเข้าถึงบริการของเราได้ทันที โดยไม่ต้องแจ้งให้ทราบล่วงหน้าหรือรับผิด สำหรับเหตุผลใดก็ตาม รวมถึงแต่ไม่จำกัดเพียงหากคุณละเมิดข้อกำหนด
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">5. การเปลี่ยนแปลงข้อกำหนด</h3>
                  <p>เราขอสงวนสิทธิ์ในการแก้ไขหรือเปลี่ยนแปลงข้อกำหนดเหล่านี้ได้ตลอดเวลา หากการแก้ไขนั้นเป็นสาระสำคัญ เราจะพยายามแจ้งให้ทราบล่วงหน้าอย่างน้อย 30 วันก่อนที่ข้อกำหนดใหม่จะมีผลบังคับใช้</p>
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
                    Welcome to Lawslane ("Service"). Please read these Terms of Service ("Terms") carefully before using the Service operated by us.
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">1. Acceptance of Terms</h3>
                  <p>
                    By accessing or using the Service, you agree to be bound by these Terms. If you do not accept any part of the Terms, you may not access the Service.
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">2. User Accounts</h3>
                  <p>
                    When you create an account with us, you must provide accurate, complete, and current information at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                  </p>
                  <p>
                    You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">3. Limitation of Liability</h3>
                  <p>
                    The Service is provided "as is" and "as available". Preliminary consultation through AI is for informational purposes only and cannot replace legal advice from a qualified attorney. Lawslane shall not be liable for any damages arising from the use of information from our Service.
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">4. Termination</h3>
                  <p>
                    We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">5. Changes to Terms</h3>
                  <p>We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.</p>
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
                    欢迎使用 Lawslane（"服务"）。请在使用我们运营的服务之前仔细阅读本服务条款（"条款"）。
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">1. 接受条款</h3>
                  <p>
                    通过访问或使用本服务，您同意受本条款的约束。如果您不接受条款的任何部分，则不能访问本服务。
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">2. 用户账户</h3>
                  <p>
                    当您在我们这里创建账户时，您必须始终提供准确、完整和最新的信息。未能做到这一点构成违反条款，可能导致您在我们服务上的账户立即终止。
                  </p>
                  <p>
                    您有责任保护用于访问服务的密码，并对您密码下的任何活动或行为负责。
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">3. 责任限制</h3>
                  <p>
                    本服务按"原样"和"可用"状态提供。通过 AI 进行的初步咨询仅供参考，不能替代合格律师的法律建议。Lawslane 对因使用我们服务信息而产生的任何损害不承担责任。
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">4. 终止</h3>
                  <p>
                    我们可能会立即终止或暂停对我们服务的访问，无需事先通知或承担责任，原因包括但不限于您违反条款。
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">5. 条款变更</h3>
                  <p>我们保留随时修改或替换本条款的权利。如果修订是重大的，我们将尽量在新条款生效前至少提前30天通知。</p>
                </div>
              </div>

              {/* Contact */}
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center space-y-2">
                <p className="text-blue-800 font-medium m-0">
                  หากมีข้อสงสัย ติดต่อ: <Link href={`/${locale}/help`} className="text-blue-600 underline hover:text-blue-800">support@lawslane.com</Link>
                </p>
                <p className="text-blue-800 font-medium m-0">
                  For questions, contact: <Link href={`/${locale}/help`} className="text-blue-600 underline hover:text-blue-800">support@lawslane.com</Link>
                </p>
                <p className="text-blue-800 font-medium m-0">
                  如有疑问，请联系：<Link href={`/${locale}/help`} className="text-blue-600 underline hover:text-blue-800">support@lawslane.com</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
