import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '../globals.css';
import React from 'react';
import { ClientProviders } from '../client-providers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import ScrollToTopButton from '@/components/ui/scroll-to-top';

export const metadata: Metadata = {
  title: 'Lawslane - ค้นหาทนายมืออาชีพ',
  description: 'ปรึกษาปัญหากฎหมายกับทนายความมืออาชีพ',
  icons: {
    icon: '/icon.jpg',
  },
  openGraph: {
    title: 'Lawslane',
    description: 'ปรึกษาปัญหากฎหมายกับทนายความมืออาชีพ',
    images: [
      {
        url: '/icon.jpg',
        width: 800,
        height: 600,
        alt: 'Lawslane Logo',
      },
    ],
  },
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  const headersList = await headers();
  const domain = headersList.get('host') || "";
  let domainType = 'main';
  if (domain.startsWith('admin.')) domainType = 'admin';
  if (domain.startsWith('lawyer.')) domainType = 'lawyer';

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* JSON-LD Structured Data for Google Search Logo */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Lawslane",
              "url": "https://lawslane.com",
              "logo": "https://lawslane.com/logo-lawslane.jpg",
              "description": "Lawyers working. ปรึกษาปัญหากฎหมายกับ ทนายความมืออาชีพ. แพลตฟอร์มที่เชื่อมโยงคุณกับทนายความผู้เชี่ยวชาญ ค้นหาทนายที่ใช่ หรือปรึกษา AI ทนายความอัจฉริยะได้ทันที.",
              "sameAs": [
                "https://www.facebook.com/lawslane",
                "https://line.me/R/ti/p/@lawslane"
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Lawslane",
              "url": "https://lawslane.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://lawslane.com/lawyers?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className="font-body antialiased">
        <NextIntlClientProvider messages={messages}>
          <ClientProviders domainType={domainType}>
            {children}
            <ScrollToTopButton />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
