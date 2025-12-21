'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function PrivacyPolicyPage() {
  const { firestore } = useFirebase();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      if (!firestore) return;
      try {
        const docRef = doc(firestore, 'siteContent', 'privacy-policy');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().content) {
          setContent(docSnap.data().content);
        }
      } catch (error) {
        console.error("Error fetching privacy policy:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [firestore]);

  const defaultContent = `
    <p>
      Lawslane ("เรา", "พวกเรา", หรือ "ของเรา") ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของคุณ
      นโยบายความเป็นส่วนตัวนี้อธิบายถึงวิธีที่เราเก็บรวบรวม, ใช้, เปิดเผย, และจัดการข้อมูลส่วนบุคคลของคุณเมื่อคุณใช้บริการเว็บไซต์และแอปพลิเคชันของเรา
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">1. ข้อมูลที่เราเก็บรวบรวม</h2>
    <p>เราอาจเก็บรวบรวมข้อมูลประเภทต่างๆ ดังนี้:</p>
    <ul class="list-disc pl-6 space-y-2 mt-2">
      <li><strong>ข้อมูลที่คุณให้เราโดยตรง:</strong> เช่น ชื่อ, อีเมล, เบอร์โทรศัพท์, และรายละเอียดเกี่ยวกับปัญหาทางกฎหมายของคุณเมื่อคุณกรอกฟอร์มหรือสร้างบัญชี</li>
      <li><strong>ข้อมูลจากการใช้บริการ:</strong> เราอาจรวบรวมข้อมูลเกี่ยวกับวิธีการที่คุณใช้บริการของเรา, ประวัติการเข้าชม, และข้อมูลอุปกรณ์ที่คุณใช้</li>
      <li><strong>คุกกี้และเทคโนโลยีที่คล้ายกัน:</strong> เราใช้คุกกี้เพื่อช่วยให้เว็บไซต์ทำงานได้อย่างมีประสิทธิภาพและเพื่อรวบรวมข้อมูลการใช้งาน</li>
    </ul>

    <h2 class="font-semibold text-xl mt-6 mb-2">2. เราใช้ข้อมูลของคุณอย่างไร</h2>
    <p>เราใช้ข้อมูลที่เก็บรวบรวมเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
    <ul class="list-disc pl-6 space-y-2 mt-2">
      <li>เพื่อให้บริการและอำนวยความสะดวกในการเชื่อมต่อคุณกับทนายความ</li>
      <li>เพื่อปรับปรุงและพัฒนาคุณภาพของบริการของเรา</li>
      <li>เพื่อสื่อสารกับคุณ, ตอบข้อสงสัย, และส่งข้อมูลที่เกี่ยวข้องกับการบริการ</li>
      <li>เพื่อวัตถุประสงค์ด้านความปลอดภัยและป้องกันการฉ้อโกง</li>
    </ul>

    <h2 class="font-semibold text-xl mt-6 mb-2">3. การเปิดเผยข้อมูล</h2>
    <p>
      เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของคุณต่อบุคคลที่สามโดยไม่ได้รับความยินยอมจากคุณ ยกเว้นในกรณีต่อไปนี้:
    </p>
    <ul class="list-disc pl-6 space-y-2 mt-2">
      <li>เมื่อจำเป็นต้องเปิดเผยข้อมูลให้แก่ทนายความที่คุณเลือกเพื่อดำเนินการให้คำปรึกษา</li>
      <li>เมื่อมีกฎหมายบังคับให้ต้องเปิดเผยข้อมูล</li>
      <li>เพื่อปกป้องสิทธิ์, ทรัพย์สิน, หรือความปลอดภัยของเราและของผู้ใช้อื่นๆ</li>
    </ul>

    <h2 class="font-semibold text-xl mt-6 mb-2">4. การใช้คุกกี้</h2>
    <p>
      เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์การใช้งานของคุณบนเว็บไซต์ของเรา คุกกี้ช่วยให้เราจดจำการตั้งค่าของคุณและวิเคราะห์การเข้าชมเว็บไซต์
      คุณสามารถจัดการหรือลบคุกกี้ได้ผ่านการตั้งค่าเบราว์เซอร์ของคุณ
    </p>

    <h2 class="font-semibold text-xl mt-6 mb-2">5. สิทธิของเจ้าของข้อมูล</h2>
    <p>คุณมีสิทธิตามกฎหมายคุ้มครองข้อมูลส่วนบุคคลในการเข้าถึง, แก้ไข, หรือขอลบข้อมูลส่วนบุคคลของคุณ คุณสามารถใช้สิทธิของคุณได้โดยติดต่อเราตามข้อมูลด้านล่าง</p>

    <h2 class="font-semibold text-xl mt-6 mb-2">6. การเปลี่ยนแปลงนโยบาย</h2>
    <p>เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว การเปลี่ยนแปลงใดๆ จะมีผลทันทีเมื่อเราเผยแพร่นโยบายฉบับใหม่บนเว็บไซต์นี้</p>

    <h2 class="font-semibold text-xl mt-6 mb-2">7. ติดต่อเรา</h2>
    <p>
      หากคุณมีคำถามหรือข้อกังวลเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ โปรดติดต่อเราได้ที่:
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
              นโยบายความเป็นส่วนตัว
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

