
'use client';

import Link from 'next/link';
import Logo from '@/components/logo';
import { usePathname } from 'next/navigation';

export default function Footer({ userRole }: { userRole: string | null }) {
  const pathname = usePathname();
  const isAuthPage = pathname.endsWith('/login') || pathname.endsWith('/signup') || pathname.endsWith('/lawyer-login');

  let quickLinks = [
    { href: `/`, label: 'หน้าแรก' },
    { href: `/articles`, label: 'บทความ' },
    { href: `/lawyers`, label: 'ค้นหาทนาย' },
    { href: `/verify-lawyer`, label: 'ตรวจสอบสถานะทนาย' },
  ];

  if (userRole === 'customer') {
    quickLinks.push({ href: `/dashboard`, label: 'แดชบอร์ดลูกค้า' });
  }

  let forLawyersLinks = [
    { href: `/for-lawyers`, label: 'เข้าร่วมเป็นทนาย Lawslane' },
    { href: `/lawyer-login`, label: 'เข้าสู่ระบบทนาย' },
  ];

  if (userRole === 'lawyer') {
    forLawyersLinks.push({ href: `/lawyer-dashboard`, label: 'Dashboard ทนาย' });
  }

  if (userRole === 'admin') {
    forLawyersLinks.push({ href: `/admin`, label: 'แดชบอร์ดผู้ดูแล' });
  }


  const legalLinks = [
    { href: `/privacy`, label: 'นโยบายความเป็นส่วนตัว' },
    { href: `/terms`, label: 'ข้อกำหนดการใช้งาน' },
    { href: `/help`, label: 'ศูนย์ช่วยเหลือ' },
  ];

  if (isAuthPage) {
    return null; // Don't render footer on auth pages
  }


  return (
    <footer id="page-footer" className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col">
            <Logo href="/" variant="white" className="text-white mb-4" />
            <p className="text-sm text-gray-400 max-w-xs">
              ตลาดกลางทนายความออนไลน์ เชื่อมต่อคุณกับผู้เชี่ยวชาญกฎหมาย
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">ลิงก์ด่วน</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">สำหรับทนายความ</h3>
            <ul className="space-y-2">
              {forLawyersLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">กฎหมาย</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Lawslane. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
