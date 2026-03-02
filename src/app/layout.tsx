import type { Metadata } from 'next';
import './globals.css';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/th.json';
import { Toaster } from '@/components/ui/toaster';
import { AdminClientLayout } from './admin-client-layout';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
    title: 'Lawslane Admin',
    description: 'ระบบจัดการ Lawslane',
    icons: {
        icon: '/icon.jpg',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="th" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body className="font-body antialiased">
                <FirebaseClientProvider>
                    <NextIntlClientProvider locale="th" messages={messages}>
                        <React.Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-500">Loading Layout...</div>}>
                            <AdminClientLayout>{children}</AdminClientLayout>
                        </React.Suspense>
                        <Toaster />
                    </NextIntlClientProvider>
                </FirebaseClientProvider>
            </body>
        </html>
    );
}
