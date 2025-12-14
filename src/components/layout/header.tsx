
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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


export default function Header({ setUserRole }: { setUserRole: (role: string | null) => void }) {
  const pathname = usePathname();
  const isHomePage = pathname === `/`;

  const [isScrolled, setIsScrolled] = useState(!isHomePage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { auth, firestore } = useFirebase();
  const { user, isUserLoading: isLoading } = useAuthUser();

  const [role, setRole] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user || !firestore) return;

      try {
        // 1. Check Lawyer Profile FIRST (Priority)
        const lawyerDocRef = doc(firestore, "lawyerProfiles", user.uid);
        const lawyerSnap = await getDoc(lawyerDocRef);

        // Hotfix for specific user
        if (lawyerSnap.exists() || user.uid === 'N5ehLbkYXbQQLX5KEuwJbeL3cXO2') {
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
        <Logo href="/" variant={useTransparentHeader ? 'color' : 'white'} className={cn(useTransparentHeader ? '' : 'text-background')} />

        <div className="hidden md:flex flex-1 justify-center px-8 lg:px-16">
          <div className="relative w-full max-w-lg">
            <Input
              type="search"
              placeholder="ค้นหาทนาย, ความเชี่ยวชาญ, หรือปัญหา..."
              className={searchInputClasses}
            />
            <Button
              type="submit"
              size="icon"
              variant="secondary"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full",
                useTransparentHeader
                  ? "bg-foreground/20 hover:bg-foreground/30"
                  : "bg-white/20 hover:bg-white/30"
              )}
            >
              <Search className={cn(
                "h-4 w-4",
                useTransparentHeader ? "text-foreground/80" : "text-white/80"
              )} />
            </Button>
          </div>

        </div>

        <nav className="hidden items-center gap-4 text-sm font-medium md:flex whitespace-nowrap">
          <Link href="/articles" className={pathname.startsWith(`/articles`) ? activeNavLinkClasses : navLinkClasses}>
            บทความ
          </Link>
          <Link href="/for-lawyers" className={pathname.startsWith(`/for-lawyers`) ? activeNavLinkClasses : navLinkClasses}>
            สำหรับทนายความ
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
                <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={(role === 'lawyer' || user.uid === 'N5ehLbkYXbQQLX5KEuwJbeL3cXO2') ? "/lawyer-dashboard" : "/dashboard"}><LayoutDashboard className="mr-2" />แดชบอร์ด</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account"><User className="mr-2" />จัดการบัญชี</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2" />ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="ghost" className={loginButtonClasses}>เข้าสู่ระบบ</Button>
            </Link>
          )}
          {user && (
            <div className={cn(useTransparentHeader ? "text-foreground" : "text-background")}>
              <NotificationBell recipientId={role === 'admin' || role === 'Super Admin' ? 'admin' : user.uid} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
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
                <span className="sr-only">เข้าสู่ระบบ</span>
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
                  <Logo href="/" variant="color" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-6">
                <nav className="flex flex-col gap-4 text-lg mt-6">
                  <Link href="/" className="hover:text-primary">หน้าแรก</Link>
                  <Link href="/articles" className="hover:text-primary">บทความ</Link>
                  <Link href="/for-lawyers" className="hover:text-primary">สำหรับทนายความ</Link>
                  <Link href="/lawyers" className="hover:text-primary">ค้นหาทนาย</Link>
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
                        <Link href={(role === 'lawyer' || user.uid === 'N5ehLbkYXbQQLX5KEuwJbeL3cXO2') ? "/lawyer-dashboard" : "/dashboard"} className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                          <LayoutDashboard className="w-4 h-4" /> แดชบอร์ด
                        </Link>
                        <Link href="/account" className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                          <User className="w-4 h-4" /> จัดการบัญชี
                        </Link>
                      </div>
                      <Button onClick={handleLogout} className="w-full mt-2" variant="destructive">ออกจากระบบ</Button>
                    </div>
                  ) : (
                    <Link href="/login">
                      <Button className="w-full">เข้าสู่ระบบ</Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
