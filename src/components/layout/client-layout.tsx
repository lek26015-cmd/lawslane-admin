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


  // Check if we are in a dashboard or admin page to hide the public header/footer
  // Handle localized paths (e.g., /th/dashboard, /en/admin)
  // Also handle subdomains (admin.*, business.*)
  const [isLoading, setIsLoading] = useState(true);
  const [activeDomainType, setActiveDomainType] = useState<'main' | 'admin' | 'business' | 'lawyer'>(domainType as any);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      let detectedType: any = 'main';
      if (host.includes('admin.')) detectedType = 'admin';
      else if (host.includes('business.')) detectedType = 'business';
      else if (host.includes('lawyer.')) detectedType = 'lawyer';

      if (detectedType !== activeDomainType) {
        setActiveDomainType(detectedType);
      }
      setIsLoading(false);
    }
  }, [domainType, activeDomainType]);

  const isLawyerPage = pathname.includes('/lawyer-') || pathname.startsWith('/lawyers');

  const isDashboardPage = !isLawyerPage && (
    (activeDomainType === 'admin') ||
    (activeDomainType === 'business') || // Hide global header/footer for all business subdomain pages
    pathname.includes('/b2b') || // Hide global header/footer for B2B landing page
    pathname.match(/^\/(th|en|zh)?\/admin/)
  );

  if (isDashboardPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {!isDashboardPage && <Header setUserRole={setUserRole} domainType={activeDomainType} />}
        <main className="flex-grow">{children}</main>
        {!isDashboardPage && <Footer userRole={userRole} domainType={activeDomainType} />}
      </div>
      {isMounted && !isDashboardPage && <FloatingChatButton />}
      {isMounted && !isDashboardPage && <ChatModal />}
      {isMounted && <CookieBanner />}
    </>
  );
}
