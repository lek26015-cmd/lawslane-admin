'use client';

import { Link, usePathname } from '@/navigation';
import { default as NextLink } from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { Input } from '@/components/ui/input';
import { Search, Menu, User, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useUser as useAuthUser, useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc } from 'firebase/firestore';
import profileLawyerImg from '@/pic/profile-lawyer.jpg';
import { NotificationBell } from '@/components/admin/notification-bell';


export default function Header({ setUserRole, domainType = 'main' }: { setUserRole: (role: string | null) => void; domainType?: string }) {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const isHomePage = pathname === `/` && domainType === 'main';

  const [isScrolled, setIsScrolled] = useState(!isHomePage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to generate links back to main domain
  const getMainLink = (path: string) => {
    if (domainType === 'main') return path;
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

    // In development, try to use the current window location if available to preserve port
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const currentHost = window.location.host;
      // If we are on a subdomain (e.g. lawyer.localhost:9002), strip it to get back to main
      // This is a simple heuristic; might need adjustment if complex subdomains exist
      const mainHost = currentHost.replace('lawyer.', '').replace('admin.', '');
      return `${window.location.protocol}//${mainHost}${path}`;
    }

    const host = process.env.NODE_ENV === 'development' ? 'localhost:9002' : rootDomain;
    return `${protocol}://${host}${path}`;
  };

  const { auth, firestore } = useFirebase();
  const { user, isUserLoading: isLoading } = useAuthUser();

  const isSuperUser = user && (user.uid === 'N5ehLbkYXbQQLX5KEuwJbeL3cXO2' || user.uid === 'wS9w7ysNYUajNsBYZ6C7n2Afe9H3');
  const [role, setRole] = useState<string | null>(null);
  const isAdmin = role === 'admin' || isSuperUser;
  const isLawyer = role === 'lawyer' || isSuperUser;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user || !firestore) return;

      try {
        // 1. Check Lawyer Profile FIRST (Priority)
        const lawyerDocRef = doc(firestore, "lawyerProfiles", user.uid);
        const lawyerSnap = await getDoc(lawyerDocRef);

        // Hotfix for specific user
        if (lawyerSnap.exists() || user.uid === 'N5ehLbkYXbQQLX5KEuwJbeL3cXO2' || user.uid === 'wS9w7ysNYUajNsBYZ6C7n2Afe9H3') {
          console.log("User is a lawyer:", user.uid);
          setRole('lawyer');
          setUserRole('lawyer');
          setAvatarUrl(lawyerSnap.exists() ? lawyerSnap.data().imageUrl : user.photoURL);
          return; // Exit early if lawyer
        }

        // 2. Check User Profile
        const userDocRef = doc(firestore, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          console.log("User is a regular user:", data.role);
          setRole(data.role || 'user');
          setUserRole(data.role || 'user');
          setAvatarUrl(data.avatar || user.photoURL);
        } else {
          // No profile found
          setRole('user');
          setUserRole('user');
          setAvatarUrl(user.photoURL);
        }

      } catch (error) {
        console.error("Error fetching role:", error);
      }
    }

    if (!isLoading) {
      fetchRole();
    }
  }, [user, isLoading, firestore, setUserRole]);

  useEffect(() => {
    if (!isHomePage) {
      if (!isScrolled) setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isHomePage]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname])

  const useTransparentHeader = isHomePage && !isScrolled;

  const { toast } = useToast();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      toast({
        title: "ออกจากระบบแล้ว!",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
      });
      // Force redirect to login page after logout
      if (domainType === 'lawyer') {
        window.location.href = '/lawyer-login';
      } else {
        window.location.href = '/';
      }
    }
  }

  const headerClasses = cn(
    'sticky top-0 z-50 w-full border-b transition-colors duration-300',
    useTransparentHeader
      ? 'bg-transparent text-foreground border-transparent'
      : 'bg-foreground text-background border-foreground'
  );

  const navLinkClasses = cn(
    'transition-colors',
    useTransparentHeader
      ? 'text-foreground/60 hover:text-foreground'
      : 'text-background/80 hover:text-background'
  );

  const activeNavLinkClasses = cn(
    'font-semibold',
    useTransparentHeader ? 'text-foreground' : 'text-background'
  );

  const loginButtonClasses = cn(
    useTransparentHeader ? '' : 'text-background hover:text-background hover:bg-white/10'
  );

  const searchInputClasses = cn(
    "w-full rounded-full border focus:ring-primary pl-4 pr-12 h-12 transition-colors",
    useTransparentHeader
      ? "bg-background/20 border-foreground/30 text-foreground placeholder:text-foreground/70 focus:bg-background/80"
      : "bg-background/20 border-foreground/30 text-background placeholder:text-background/70 focus:bg-background/30"
  )


  return (
    <header className={headerClasses}>
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Logo href={getMainLink('/')} variant={useTransparentHeader ? 'color' : 'white'} className={cn(useTransparentHeader ? '' : 'text-background')} />



        <div className="hidden lg:flex items-center gap-6">
          <nav className="flex items-center gap-4 text-sm font-medium whitespace-nowrap">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn("flex items-center gap-1 font-medium focus:outline-none", navLinkClasses)}>
                {t('forSME')} <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/services/contracts">{t('smeMenu.contracts')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sme#contact">{t('smeMenu.consultant')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/services/registration">{t('smeMenu.registration')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sme#contact">{t('smeMenu.dispute')}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href={getMainLink('/lawyers')} className={pathname.startsWith(`/lawyers`) ? activeNavLinkClasses : navLinkClasses}>
              {t('findLawyer')}
            </Link>
            <Link href={getMainLink('/verify-lawyer')} className={pathname.startsWith(`/verify-lawyer`) ? activeNavLinkClasses : navLinkClasses}>
              {t('verifyLawyer')}
            </Link>
            <Link href={getMainLink('/articles')} className={pathname.startsWith(`/articles`) ? activeNavLinkClasses : navLinkClasses}>
              {t('articles')}
            </Link>
            <Link href={getMainLink('/forms')} className={pathname.startsWith(`/forms`) ? activeNavLinkClasses : navLinkClasses}>
              {t('forms')}
            </Link>
            <Link href={getMainLink('/for-lawyers')} className={pathname.startsWith(`/for-lawyers`) ? activeNavLinkClasses : navLinkClasses}>
              {t('forLawyers')}
            </Link>
          </nav>

          <div className="hidden items-center gap-2 md:flex ml-4 whitespace-nowrap">

            {isLoading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={cn("flex items-center gap-2", loginButtonClasses)}>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={avatarUrl || profileLawyerImg.src} />
                      <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline">{user.displayName || user.email}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <a href={`${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://admin.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com'}`}>
                        <LayoutDashboard className="mr-2" />{t('adminDashboard')}
                      </a>
                    </DropdownMenuItem>
                  )}

                  {(isLawyer || isSuperUser) && (
                    <DropdownMenuItem asChild>
                      <NextLink href="/lawyer-dashboard">
                        <LayoutDashboard className="mr-2" />{t('dashboard')} {isSuperUser ? '(ทนาย)' : ''}
                      </NextLink>
                    </DropdownMenuItem>
                  )}

                  {(!isAdmin && !isLawyer || isSuperUser) && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2" />
                        {t('dashboard')} {isSuperUser ? '(ผู้ใช้)' : ''}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/account"><User className="mr-2" />{t('manageAccount')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2" />{t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button className={cn(
                  "rounded-full px-8 h-10 font-bold shadow-lg transition-all transform hover:scale-105",
                  useTransparentHeader
                    ? "bg-[#0B3979] text-white border-2 border-white/20 hover:bg-[#082a5a]"
                    : "bg-[#0B3979] text-white hover:bg-[#082a5a]"
                )}>
                  {t('login')}
                </Button>
              </Link>
            )}
            {user && (
              <div className={cn(useTransparentHeader ? "text-foreground" : "text-background")}>
                <NotificationBell recipientId={role === 'admin' || role === 'Super Admin' ? 'admin' : user.uid} />
              </div>
            )}
            <div className={cn(
              "transition-all duration-300 ease-in-out ml-2",
              useTransparentHeader ? "text-foreground" : "text-background"
            )}>
              <LanguageSwitcher
                className={cn(
                  "h-9 px-3 text-sm",
                  useTransparentHeader
                    ? "text-foreground border-foreground/20 bg-foreground/5 hover:bg-foreground/10"
                    : "text-white border-white/20 bg-white/10 hover:bg-white/20"
                )}
                iconClassName={useTransparentHeader ? "text-foreground" : "text-white"}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <div className={cn(
            "transition-all duration-300 ease-in-out mr-1",
            useTransparentHeader ? "text-foreground" : "text-background"
          )}>
            <LanguageSwitcher
              className={cn(
                "h-8 px-2 text-xs",
                useTransparentHeader
                  ? "text-foreground border-foreground/20 bg-foreground/5 hover:bg-foreground/10"
                  : "text-white border-white/20 bg-white/10 hover:bg-white/20"
              )}
              iconClassName={useTransparentHeader ? "text-foreground" : "text-white"}
            />
          </div>
          {user ? (
            <Link href="/account">
              <Avatar className="w-8 h-8 border border-border/50">
                <AvatarImage src={avatarUrl || profileLawyerImg.src} />
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon" className={cn(useTransparentHeader ? 'text-foreground' : 'text-background')}>
                <User className="w-5 h-5" />
                <span className="sr-only">{t('login')}</span>
              </Button>
            </Link>
          )}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={cn(useTransparentHeader ? 'text-foreground' : 'text-background')}>
                <Menu />
                <span className="sr-only">เปิดเมนู</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="p-6 pb-0">
                <SheetTitle>
                  <Logo href={getMainLink('/')} variant="color" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
                <nav className="flex flex-col gap-4 text-lg mt-6">
                  <Link href={getMainLink('/')} className="hover:text-primary">{t('home')}</Link>

                  <div className="flex flex-col gap-2 py-2">
                    <span className="font-semibold">{t('forSME')}</span>
                    <Link href="/services/contracts" className="pl-4 text-base hover:text-primary text-muted-foreground">{t('smeMenu.contracts')}</Link>
                    <Link href="/sme#contact" className="pl-4 text-base hover:text-primary text-muted-foreground">{t('smeMenu.consultant')}</Link>
                    <Link href="/services/registration" className="pl-4 text-base hover:text-primary text-muted-foreground">{t('smeMenu.registration')}</Link>
                    <Link href="/sme#contact" className="pl-4 text-base hover:text-primary text-muted-foreground">{t('smeMenu.dispute')}</Link>
                  </div>

                  <Link href={getMainLink('/articles')} className="hover:text-primary">{t('articles')}</Link>
                  <Link href={getMainLink('/forms')} className="hover:text-primary">{t('forms')}</Link>
                  <Link href={getMainLink('/for-lawyers')} className="hover:text-primary">{t('forLawyers')}</Link>
                  <Link href={getMainLink('/lawyers')} className="hover:text-primary">{t('findLawyer')}</Link>
                  <Link href={getMainLink('/verify-lawyer')} className="hover:text-primary">{t('verifyLawyer')}</Link>
                </nav>
                <div className="border-t pt-6">
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={avatarUrl || profileLawyerImg.src} />
                          <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold">{user.displayName || user.email}</span>
                          <span className="text-xs text-muted-foreground capitalize">{role === 'lawyer' ? 'ทนายความ' : role === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกค้า'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {isAdmin && (
                          <NextLink href="/admin" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md text-foreground">
                            <LayoutDashboard className="w-4 h-4" /> {t('adminDashboard')}
                          </NextLink>
                        )}
                        {(isLawyer || isSuperUser) && (
                          <NextLink href="/lawyer-dashboard" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md text-foreground">
                            <LayoutDashboard className="w-4 h-4" /> {t('dashboard')} {isSuperUser ? '(ทนาย)' : ''}
                          </NextLink>
                        )}
                        {!isAdmin && !isLawyer && (
                          <Link href="/dashboard" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                            <LayoutDashboard className="w-4 h-4" /> {t('dashboard')}
                          </Link>
                        )}
                        <Link href="/account" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                          <User className="w-4 h-4" /> {t('manageAccount')}
                        </Link>
                      </div>
                      <Button onClick={handleLogout} className="w-full mt-2" variant="destructive">{t('logout')}</Button>
                    </div>
                  ) : (
                    <Link href="/login">
                      <Button className="w-full rounded-xl bg-[#0B3979] hover:bg-[#082a5a] text-white font-semibold">{t('login')}</Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header >
  );
}
