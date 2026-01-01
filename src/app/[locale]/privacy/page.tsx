'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function PrivacyPolicyPage() {
  const { firestore } = useFirebase();
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
              นโยบายความเป็นส่วนตัว
            </h1>
            <p className="text-lg text-muted-foreground">
              Privacy Policy / 隐私政策
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
                    Lawslane ("เรา", "พวกเรา", หรือ "ของเรา") ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของคุณ
                    นโยบายความเป็นส่วนตัวนี้อธิบายถึงวิธีที่เราเก็บรวบรวม, ใช้, เปิดเผย, และจัดการข้อมูลส่วนบุคคลของคุณเมื่อคุณใช้บริการเว็บไซต์และแอปพลิเคชันของเรา
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">1. ข้อมูลที่เราเก็บรวบรวม</h3>
                  <p>เราอาจเก็บรวบรวมข้อมูลประเภทต่างๆ ดังนี้:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li><strong>ข้อมูลที่คุณให้เราโดยตรง:</strong> เช่น ชื่อ, อีเมล, เบอร์โทรศัพท์, และรายละเอียดเกี่ยวกับปัญหาทางกฎหมายของคุณเมื่อคุณกรอกฟอร์มหรือสร้างบัญชี</li>
                    <li><strong>ข้อมูลจากการใช้บริการ:</strong> เราอาจรวบรวมข้อมูลเกี่ยวกับวิธีการที่คุณใช้บริการของเรา, ประวัติการเข้าชม, และข้อมูลอุปกรณ์ที่คุณใช้</li>
                    <li><strong>คุกกี้และเทคโนโลยีที่คล้ายกัน:</strong> เราใช้คุกกี้เพื่อช่วยให้เว็บไซต์ทำงานได้อย่างมีประสิทธิภาพและเพื่อรวบรวมข้อมูลการใช้งาน</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">2. เราใช้ข้อมูลของคุณอย่างไร</h3>
                  <p>เราใช้ข้อมูลที่เก็บรวบรวมเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>เพื่อให้บริการและอำนวยความสะดวกในการเชื่อมต่อคุณกับทนายความ</li>
                    <li>เพื่อปรับปรุงและพัฒนาคุณภาพของบริการของเรา</li>
                    <li>เพื่อสื่อสารกับคุณ, ตอบข้อสงสัย, และส่งข้อมูลที่เกี่ยวข้องกับการบริการ</li>
                    <li>เพื่อวัตถุประสงค์ด้านความปลอดภัยและป้องกันการฉ้อโกง</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">3. การเปิดเผยข้อมูล</h3>
                  <p>เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของคุณต่อบุคคลที่สามโดยไม่ได้รับความยินยอมจากคุณ ยกเว้นในกรณีต่อไปนี้:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>เมื่อจำเป็นต้องเปิดเผยข้อมูลให้แก่ทนายความที่คุณเลือกเพื่อดำเนินการให้คำปรึกษา</li>
                    <li>เมื่อมีกฎหมายบังคับให้ต้องเปิดเผยข้อมูล</li>
                    <li>เพื่อปกป้องสิทธิ์, ทรัพย์สิน, หรือความปลอดภัยของเราและของผู้ใช้อื่นๆ</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">4. สิทธิของเจ้าของข้อมูล</h3>
                  <p>คุณมีสิทธิตามกฎหมายคุ้มครองข้อมูลส่วนบุคคลในการเข้าถึง, แก้ไข, หรือขอลบข้อมูลส่วนบุคคลของคุณ คุณสามารถใช้สิทธิของคุณได้โดยติดต่อเราตามข้อมูลด้านล่าง</p>
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
                    Lawslane ("we", "us", or "our") values the protection of your personal data.
                    This privacy policy explains how we collect, use, disclose, and manage your personal information when you use our website and application services.
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">1. Information We Collect</h3>
                  <p>We may collect the following types of information:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li><strong>Information you provide directly:</strong> Such as name, email, phone number, and details about your legal issues when you fill out forms or create an account</li>
                    <li><strong>Usage information:</strong> We may collect information about how you use our services, browsing history, and device information</li>
                    <li><strong>Cookies and similar technologies:</strong> We use cookies to help the website function efficiently and to collect usage data</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">2. How We Use Your Information</h3>
                  <p>We use the collected information for the following purposes:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>To provide services and facilitate connecting you with lawyers</li>
                    <li>To improve and enhance the quality of our services</li>
                    <li>To communicate with you, answer questions, and send service-related information</li>
                    <li>For security purposes and fraud prevention</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">3. Disclosure of Information</h3>
                  <p>We will not disclose your personal information to third parties without your consent, except in the following cases:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>When necessary to disclose information to the lawyer you selected for consultation</li>
                    <li>When required by law</li>
                    <li>To protect the rights, property, or safety of us and other users</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">4. Data Subject Rights</h3>
                  <p>You have rights under personal data protection laws to access, correct, or request deletion of your personal data. You can exercise your rights by contacting us using the information below.</p>
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
                    Lawslane（"我们"）重视您的个人数据保护。
                    本隐私政策说明了当您使用我们的网站和应用程序服务时，我们如何收集、使用、披露和管理您的个人信息。
                  </p>

                  <h3 className="font-semibold text-xl mt-6 mb-2">1. 我们收集的信息</h3>
                  <p>我们可能收集以下类型的信息：</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li><strong>您直接提供的信息：</strong>例如姓名、电子邮件、电话号码以及您在填写表格或创建账户时提供的法律问题详情</li>
                    <li><strong>使用信息：</strong>我们可能收集有关您如何使用我们服务的信息、浏览历史和设备信息</li>
                    <li><strong>Cookie和类似技术：</strong>我们使用Cookie来帮助网站高效运行并收集使用数据</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">2. 我们如何使用您的信息</h3>
                  <p>我们将收集的信息用于以下目的：</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>提供服务并促进您与律师的联系</li>
                    <li>改进和提升我们的服务质量</li>
                    <li>与您沟通、回答问题并发送服务相关信息</li>
                    <li>用于安全目的和防止欺诈</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">3. 信息披露</h3>
                  <p>未经您的同意，我们不会向第三方披露您的个人信息，以下情况除外：</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>需要向您选择的律师披露信息以进行咨询</li>
                    <li>法律要求披露时</li>
                    <li>为保护我们和其他用户的权利、财产或安全</li>
                  </ul>

                  <h3 className="font-semibold text-xl mt-6 mb-2">4. 数据主体权利</h3>
                  <p>根据个人数据保护法，您有权访问、更正或请求删除您的个人数据。您可以通过以下联系方式行使您的权利。</p>
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
