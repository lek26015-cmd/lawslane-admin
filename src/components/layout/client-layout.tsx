'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import FloatingChatButton from '@/components/chat/floating-chat-button';
import ChatModal from '@/components/chat/chat-modal';
import CookieBanner from '@/components/cookie-banner';
import { useUser as useAuthUser, useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ClientLayout({
  children,
  domainType = 'main',
}: {
  children: React.ReactNode;
  domainType?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user } = useAuthUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Fix Radix UI hydration mismatch by waiting for client mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth Guard for Education Students
  useEffect(() => {
    async function checkRole() {
      if (!user || !firestore) return;

      // Optimization: If userRole is already set (from Header lifting state), use it
      if (userRole === 'education_student') {
        if (!pathname.startsWith('/education')) {
          router.push('/education');
        }
        return;
      }

      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.role === 'education_student') {
            if (!pathname.startsWith('/education')) {
              router.push('/education');
            }
          }
        }
      } catch (error) {
        console.error("Auth Guard Error:", error);
      }
    }

    checkRole();
  }, [user, firestore, pathname, router, userRole]);

  // Hide header/footer ONLY for admin pages (lawyer pages should show header now)
  const isAdminPage = pathname.startsWith('/admin') || domainType === 'admin';

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {isMounted ? (
          <Header setUserRole={setUserRole} domainType={domainType} />
        ) : (
          <header className="sticky top-0 z-50 h-16 bg-white border-b" />
        )}
        <main className="flex-1 bg-gray-50/50">{children}</main>
        <Footer userRole={userRole} />
      </div>
      <FloatingChatButton />
      <ChatModal />
      <CookieBanner />
    </>
  );
}
