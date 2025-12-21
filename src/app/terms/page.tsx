'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function TermsOfServicePage() {
  const { firestore } = useFirebase();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      if (!firestore) return;
      try {
        const docRef = doc(firestore, 'siteContent', 'terms-of-service');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().content) {
          setContent(docSnap.data().content);
        }
      } catch (error) {
        console.error("Error fetching terms of service:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [firestore]);

  const defaultContent = `
    <p>
      ยินดีต้อนรับสู่ Lawslane ("บริการ") โปรดอ่านข้อกำหนดและเงื่อนไขการใช้บริการเหล่านี้ ("ข้อกำหนด") อย่างละเอียดก่อนใช้บริการที่ดำเนินการโดยเรา
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">1. การยอมรับข้อกำหนด</h2>
    <p>
      โดยการเข้าถึงหรือใช้บริการ คุณตกลงที่จะผูกพันตามข้อกำหนดเหล่านี้ หากคุณไม่ยอมรับส่วนหนึ่งส่วนใดของข้อกำหนด คุณจะไม่สามารถเข้าถึงบริการได้
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">2. บัญชีผู้ใช้</h2>
    <p>
      เมื่อคุณสร้างบัญชีกับเรา คุณต้องให้ข้อมูลที่ถูกต้อง ครบถ้วน และเป็นปัจจุบันอยู่เสมอ การไม่ทำเช่นนั้นถือเป็นการละเมิดข้อกำหนด ซึ่งอาจส่งผลให้มีการยุติบัญชีของคุณในบริการของเราทันที
    </p>
    <p>
      คุณมีหน้าที่รับผิดชอบในการรักษารหัสผ่านที่คุณใช้ในการเข้าถึงบริการและสำหรับกิจกรรมหรือการกระทำใด ๆ ภายใต้รหัสผ่านของคุณ
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">3. การเชื่อมโยงไปยังเว็บไซต์อื่น</h2>
    <p>
      บริการของเราอาจมีลิงก์ไปยังเว็บไซต์หรือบริการของบุคคลที่สามซึ่งไม่ได้เป็นเจ้าของหรือควบคุมโดย Lawslane เราไม่สามารถควบคุมและไม่รับผิดชอบต่อเนื้อหา นโยบายความเป็นส่วนตัว หรือแนวปฏิบัติของเว็บไซต์หรือบริการของบุคคลที่สามใดๆ
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">4. การยุติการให้บริการ</h2>
    <p>
      เราอาจยุติหรือระงับการเข้าถึงบริการของเราได้ทันที โดยไม่ต้องแจ้งให้ทราบล่วงหน้าหรือรับผิด สำหรับเหตุผลใดก็ตาม รวมถึงแต่ไม่จำกัดเพียงหากคุณละเมิดข้อกำหนด
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">5. ข้อจำกัดความรับผิด</h2>
    <p>
      บริการนี้จัดทำขึ้น "ตามสภาพ" และ "ตามที่มี" การให้คำปรึกษาเบื้องต้นผ่าน AI เป็นเพียงข้อมูลเพื่อประกอบการตัดสินใจ ไม่สามารถใช้แทนคำแนะนำทางกฎหมายจากทนายความผู้เชี่ยวชาญได้ Lawslane จะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดขึ้นจากการใช้ข้อมูลจากบริการของเรา
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">6. การเปลี่ยนแปลงข้อกำหนด</h2>
    <p>เราขอสงวนสิทธิ์ในการแก้ไขหรือเปลี่ยนแปลงข้อกำหนดเหล่านี้ได้ตลอดเวลาตามดุลยพินิจของเราแต่เพียงผู้เดียว หากการแก้ไขนั้นเป็นสาระสำคัญ เราจะพยายามแจ้งให้ทราบล่วงหน้าอย่างน้อย 30 วันก่อนที่ข้อกำหนดใหม่จะมีผลบังคับใช้</p>

    <h2 class="font-semibold text-xl mt-6 mb-2">7. ติดต่อเรา</h2>
    <p>
      หากคุณมีคำถามใดๆ เกี่ยวกับข้อกำหนดเหล่านี้ โปรดติดต่อเราที่:
      อีเมล: <a href="mailto:support@lawslane.demo" class="text-primary hover:underline">support@lawslane.demo</a>
    </p>
  `;

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
              ปรับปรุงล่าสุด: 25 กรกฎาคม 2567
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 md:px-6 -mt-12 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <div
                className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 transition-colors"
                dangerouslySetInnerHTML={{ __html: content || defaultContent }}
              />
            )}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อเราได้ที่ <a href="mailto:support@lawslane.demo" className="text-primary font-medium hover:underline">support@lawslane.demo</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

