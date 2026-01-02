import type { Metadata } from 'next';
import '../globals.css';
import React from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ChatProvider } from '@/context/chat-context';
import { Toaster } from '@/components/ui/toaster';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const metadata: Metadata = {
    title: 'Lawslane Lawyer System',
    description: 'ระบบสำหรับทนายความ Lawslane',
    icons: {
        icon: '/icon.jpg',
    },
};

export default async function LawyerLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Force Thai locale for lawyer system
    const locale = 'th';
    const messages = await getMessages({ locale });

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body className="font-body antialiased">
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <FirebaseClientProvider>
                        <ChatProvider>
                            {children}
                            <Toaster />
                        </ChatProvider>
                    </FirebaseClientProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
