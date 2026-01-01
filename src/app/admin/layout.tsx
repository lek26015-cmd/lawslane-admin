import type { Metadata } from 'next';
import '../globals.css';
import React from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ChatProvider } from '@/context/chat-context';
import { Toaster } from '@/components/ui/toaster';
import { AdminClientLayout } from './admin-client-layout';

export const metadata: Metadata = {
    title: 'Lawslane Admin',
    description: 'ระบบจัดการ Lawslane',
    icons: {
        icon: '/icon.jpg',
    },
};

export default function AdminLayout({
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
                    <ChatProvider>
                        <AdminClientLayout>{children}</AdminClientLayout>
                        <Toaster />
                    </ChatProvider>
                </FirebaseClientProvider>
            </body>
        </html>
    );
}
