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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
