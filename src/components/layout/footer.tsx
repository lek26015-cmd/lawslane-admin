'use client';

import Link from 'next/link';
import Logo from '@/components/logo';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

export default function Footer({ userRole }: { userRole: string | null }) {
  const pathname = usePathname();
  const t = useTranslations('Footer');
  const locale = useLocale();
  const isAuthPage = pathname.endsWith('/login') || pathname.endsWith('/signup') || pathname.endsWith('/lawyer-login');

  let quickLinks = [
    { href: `/${locale}`, label: t('quickLinks.home') },
    { href: `/${locale}/about`, label: t('quickLinks.about') },
    { href: `/${locale}/articles`, label: t('quickLinks.articles') },
    { href: `/${locale}/lawyers`, label: t('quickLinks.findLawyer') },
    { href: `/verify-lawyer`, label: t('quickLinks.verifyLawyer') },
  ];

  if (userRole === 'customer') {
    quickLinks.push({ href: `/${locale}/dashboard`, label: t('quickLinks.customerDashboard') });
  }

  let forLawyersLinks = [
    { href: `/${locale}/for-lawyers`, label: t('forLawyers.join') },
    { href: `/lawyer-login`, label: t('forLawyers.login') },
  ];

  if (userRole === 'lawyer') {
    forLawyersLinks.push({ href: `/lawyer-dashboard`, label: t('forLawyers.dashboard') });
  }

  if (userRole === 'admin') {
    forLawyersLinks.push({ href: `/admin`, label: t('forLawyers.adminDashboard') });
    forLawyersLinks.push({ href: `/lawyer-dashboard?view=admin`, label: t('forLawyers.adminView') });
  }


  const legalLinks = [
    { href: `/${locale}/privacy`, label: t('legal.privacy') },
    { href: `/${locale}/terms`, label: t('legal.terms') },
    { href: `/${locale}/ai-disclaimer`, label: t('legal.aiDisclaimer') },
    { href: `/${locale}/help`, label: t('legal.help') },
  ];

  if (isAuthPage) {
    return null; // Don't render footer on auth pages
  }


  return (
    <footer id="page-footer" className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col">
            <Logo href={`/${locale}`} variant="white" className="text-white mb-4" />
            <p className="text-sm text-gray-400 max-w-xs mb-4">
              {t('description')}
            </p>
            {/* Social Media Links */}
            <div className="flex gap-3">
              <a href="https://www.facebook.com/lawslane" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </a>
              <a href="https://lin.ee/CZzSmHr" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-green-500 flex items-center justify-center transition-colors" aria-label="LINE">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </a>
              <a href="https://www.tiktok.com/@lawslane" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-black flex items-center justify-center transition-colors ring-1 ring-gray-700 hover:ring-white" aria-label="TikTok">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">{t('quickLinks.title')}</h3>
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
            <h3 className="font-semibold text-white mb-4">{t('forLawyers.title')}</h3>
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
            <h3 className="font-semibold text-white mb-4">{t('legal.title')}</h3>
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
          {/* Copyright Section */}
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
