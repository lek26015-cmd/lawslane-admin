'use client';

import { Link, usePathname } from '@/navigation';
import { default as NextLink } from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import { Input } from '@/components/ui/input';
import { Search, Menu, User, ChevronDown, LogOut, LayoutDashboard, Camera } from 'lucide-react';
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
import { getMainLink, getBusinessLink } from '@/lib/domain-utils';


export default function Header({ setUserRole, domainType = 'main' }: { setUserRole: (role: string | null) => void; domainType?: 'main' | 'lawyer' | 'admin' | 'business' }) {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Home page detection that handles locales
  const isHomePage = (pathname === '/' || pathname === '/th' || pathname === '/en' || pathname === '/zh') && domainType === 'main';

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
  }, [isHomePage, isScrolled]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname])

  // Ensure stable initial render for hydration
  const useTransparentHeader = isMounted && isHomePage && !isScrolled;

  const { toast } = useToast();

  const handleLogout = async () => {
    if (auth) {
      try {
        await fetch('/api/auth/session', { method: 'DELETE' });
      } catch (err) {
        console.error("Failed to clear session cookie:", err);
      }
      await signOut(auth);
      toast({
        title: "ออกจากระบบแล้ว!",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
      });
      // Force redirect to login page after logout
      window.location.href = '/';
    }
  }

  const headerClasses = cn(
    'sticky top-0 z-50 w-full transition-all duration-300',
    useTransparentHeader
      ? 'bg-transparent text-white border-transparent'
      : 'bg-white/95 backdrop-blur-md text-slate-900 border-slate-200 shadow-sm border-b'
  );

  const navLinkClasses = cn(
    'transition-colors font-medium leading-none',
    useTransparentHeader
      ? 'text-white/70 hover:text-white'
      : 'text-slate-600 hover:text-[#0B3979]'
  );

  const activeNavLinkClasses = cn(
    'font-bold',
    useTransparentHeader ? 'text-white' : 'text-[#0B3979]'
  );

  const loginButtonClasses = cn(
    useTransparentHeader ? '' : 'text-slate-700 hover:text-[#0B3979] hover:bg-slate-50'
  );

  const searchInputClasses = cn(
    "w-full rounded-full border focus:ring-primary pl-4 pr-12 h-12 transition-colors",
    useTransparentHeader
      ? "bg-background/20 border-foreground/30 text-foreground placeholder:text-foreground/70 focus:bg-background/80"
      : "bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white"
  )


  return (
    <header className={headerClasses}>
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Logo
          href={getMainLink('/', domainType, !isMounted)}
          variant={useTransparentHeader ? "white" : "color"}
          className={cn(useTransparentHeader ? 'text-white' : 'text-[#0B3979]')}
          subtitle={domainType === 'business' ? "Business ELM" : undefined}
        />



        <div className="hidden xl:flex items-center gap-6">
          <nav className="flex items-center gap-4 text-sm font-medium whitespace-nowrap">
            {isMounted && (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn("flex items-center gap-1 font-medium focus:outline-none", navLinkClasses)}>
                  {t('forB2B')} <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-2">
                  <DropdownMenuLabel className="text-blue-700 font-bold bg-blue-50/50 rounded-md">Corporate Plans</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a href={getBusinessLink('/dashboard', domainType)} className="font-bold text-blue-700 w-full flex items-center px-2 py-1.5">{t('b2bMenu.dashboard')}</a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a href={getBusinessLink('/', domainType)} className="w-full flex items-center px-2 py-1.5">{t('b2bMenu.pricing')}</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a href={getBusinessLink('/clm', domainType)} className="w-full flex items-center px-2 py-1.5">{t('b2bMenu.clm')}</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={getMainLink('/forms', domainType)}>{t('b2bMenu.templates')}</Link>
                  </DropdownMenuItem>

                  <div className="mt-2 mb-1">
                    <DropdownMenuLabel className="text-slate-500 font-bold bg-slate-50 rounded-md">SME Solutions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </div>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={getMainLink('/services/contracts', domainType)}>{t('smeMenu.contracts')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={getMainLink('/services/registration', domainType)}>{t('smeMenu.registration')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={getMainLink('/b2b#contact', domainType)}>{t('smeMenu.consultant')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={getMainLink('/b2b#contact', domainType)}>{t('smeMenu.dispute')}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link href={getMainLink('/lawyers', domainType)} className={pathname.startsWith(`/lawyers`) ? activeNavLinkClasses : navLinkClasses}>
              {t('findLawyer')}
            </Link>
            <Link href={getMainLink('/verify-lawyer', domainType)} className={pathname.startsWith(`/verify-lawyer`) ? activeNavLinkClasses : navLinkClasses}>
              {t('verifyLawyer')}
            </Link>
            <Link href={getMainLink('/articles', domainType)} className={pathname.startsWith(`/articles`) ? activeNavLinkClasses : navLinkClasses}>
              {t('articles')}
            </Link>
            <Link href={getMainLink('/forms', domainType)} className={pathname.startsWith(`/forms`) ? activeNavLinkClasses : navLinkClasses}>
              {t('forms')}
            </Link>
            <Link href={getMainLink('/services/contracts/screenshot', domainType)} className={pathname.startsWith(`/services/contracts/screenshot`) ? activeNavLinkClasses : navLinkClasses}>
              <span className="flex items-center gap-1"><Camera className="h-4 w-4" />{t('capAndDeal')}</span>
            </Link>
            <Link href={getMainLink('/for-lawyers', domainType)} className={pathname.startsWith(`/for-lawyers`) ? activeNavLinkClasses : navLinkClasses}>
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
                      {process.env.NODE_ENV === 'development' ? (
                        <Link href="/admin">
                          <LayoutDashboard className="mr-2" />{t('adminDashboard')}
                        </Link>
                      ) : (
                        <a href={`${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://admin.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com'}`}>
                          <LayoutDashboard className="mr-2" />{t('adminDashboard')}
                        </a>
                      )}
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
                  "rounded-full px-8 h-10 font-bold shadow-lg transition-all transform hover:scale-105 leading-none",
                  useTransparentHeader
                    ? "bg-[#0B3979] text-white border-2 border-white/20 hover:bg-[#082a5a]"
                    : "bg-[#0B3979] text-white hover:bg-[#082a5a]"
                )}>
                  {t('login')}
                </Button>
              </Link>
            )}
            {user && (
              <div className={cn(useTransparentHeader ? "text-white" : "text-slate-900")}>
                <NotificationBell recipientId={role === 'admin' || role === 'Super Admin' ? 'admin' : user.uid} />
              </div>
            )}
            <div className={cn(
              "transition-all duration-300 ease-in-out ml-2",
              useTransparentHeader ? "text-white" : "text-slate-900"
            )}>
              <LanguageSwitcher
                className={cn(
                  "h-9 px-3 text-sm flex items-center",
                  useTransparentHeader
                    ? "text-white border-white/20 bg-white/10 hover:bg-white/20"
                    : "text-slate-900 border-slate-200 bg-slate-100 hover:bg-slate-200"
                )}
                iconClassName={useTransparentHeader ? "text-white" : "text-slate-900"}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <div className={cn(
            "transition-all duration-300 ease-in-out mr-1",
            useTransparentHeader ? "text-white" : "text-slate-900"
          )}>
            <LanguageSwitcher
              className={cn(
                "h-8 px-2 text-xs flex items-center",
                useTransparentHeader
                  ? "text-white border-white/20 bg-white/10 hover:bg-white/20"
                  : "text-slate-900 border-slate-200 bg-slate-100 hover:bg-slate-200"
              )}
              iconClassName={useTransparentHeader ? "text-white" : "text-slate-900"}
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
            <SheetContent side="left" className="p-0 flex flex-col h-full">
              <SheetHeader className="p-6 pb-0">
                <SheetTitle>
                  <Logo
                    href={getMainLink('/', domainType, !isMounted)}
                    variant="color"
                    subtitle={domainType === 'business' ? "Business ELM" : undefined}
                  />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
                <nav className="flex flex-col gap-4 text-lg mt-6">
                  <Link href={getMainLink('/', domainType, !isMounted)} className="hover:text-primary">{t('home')}</Link>

                  <div className="flex flex-col gap-2 py-2">
                    <span className="font-semibold text-lg">{t('forB2B')}</span>

                    <span className="pl-4 text-sm font-semibold text-blue-600 mt-2">Corporate Plans</span>
                    <a href={getBusinessLink('/', domainType, !isMounted)} className="pl-6 text-base hover:text-primary text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>{t('b2bMenu.pricing')}</a>
                    <a href={getBusinessLink('/clm', domainType, !isMounted)} className="pl-6 text-base hover:text-primary text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>{t('b2bMenu.clm')}</a>
                    <a href={getBusinessLink('/forms', domainType, !isMounted)} className="pl-6 text-base hover:text-primary text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>{t('b2bMenu.templates')}</a>

                    <span className="pl-4 text-sm font-semibold text-slate-500 mt-2">SME Solutions</span>
                    <Link href={getMainLink('/services/contracts', domainType)} className="pl-6 text-base hover:text-primary text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>{t('smeMenu.contracts')}</Link>
                    <Link href={getMainLink('/services/registration', domainType)} className="pl-6 text-base hover:text-primary text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>{t('smeMenu.registration')}</Link>
                    <Link href={getMainLink('/b2b#contact', domainType)} className="pl-6 text-base hover:text-primary text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>{t('smeMenu.consultant')}</Link>
                    <Link href={getMainLink('/b2b#contact', domainType)} className="pl-6 text-base hover:text-primary text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>{t('smeMenu.dispute')}</Link>
                  </div>

                  <Link href={getMainLink('/articles', domainType)} className="hover:text-primary">{t('articles')}</Link>
                  <Link href={getMainLink('/forms', domainType)} className="hover:text-primary">{t('forms')}</Link>
                  <Link href={getMainLink('/services/contracts/screenshot', domainType)} className="flex items-center gap-2 hover:text-primary"><Camera className="h-5 w-5" />{t('capAndDeal')}</Link>
                  <Link href={getMainLink('/for-lawyers', domainType)} className="hover:text-primary">{t('forLawyers')}</Link>
                  <Link href={getMainLink('/lawyers', domainType)} className="hover:text-primary">{t('findLawyer')}</Link>
                  <Link href={getMainLink('/verify-lawyer', domainType)} className="hover:text-primary">{t('verifyLawyer')}</Link>
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

      </div >
    </header >
  );
}
