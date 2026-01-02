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
            <p className="text-sm text-gray-400 max-w-xs">
              {t('description')}
            </p>
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
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
