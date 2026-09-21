'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ArrowLeftCircle,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
} from 'lucide-react';
import React, { useState, useEffect, useContext } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FirebaseContext, errorEmitter, FirestorePermissionError } from '@/firebase';
import AdminLoginPage from './login/page';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NotificationBell } from '@/components/admin/notification-bell';
import { navSections, findSectionForPath } from '@/config/nav';
import { isDesignatedSuperAdmin } from '@/lib/super-admin';


export function AdminClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const firebaseContext = useContext(FirebaseContext);
    const { auth, firestore, areServicesAvailable } = firebaseContext || {};

    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    // null = unrestricted (Super Admin), string[] = specific permissions
    const [adminPermissions, setAdminPermissions] = useState<string[] | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // กางเมนูของหน้าที่เปิดอยู่เป็นค่าเริ่มต้น
    // (เดิม default เป็น "ภาพรวม" ซึ่งไม่ใช่ชื่อ section ใดแล้ว เมนูจึงปิดหมดทุกครั้ง)
    const [openSection, setOpenSection] = useState<string | null>(() => findSectionForPath(pathname));

    const toggleSection = (title: string) => {
        setOpenSection(prev => prev === title ? null : title);
    };

    useEffect(() => {
        console.log('AdminClientLayout: areServicesAvailable:', areServicesAvailable);
        console.log('AdminClientLayout: auth exists:', !!auth);
        console.log('AdminClientLayout: firestore exists:', !!firestore);

        if (!areServicesAvailable || !auth || !firestore) {
            console.log('AdminClientLayout: Services not ready yet, skipping auth check');
            setIsCheckingAuth(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(firestore, "users", user.uid);

                getDoc(userDocRef).then(userDoc => {
                    if (!userDoc.exists()) {
                        const allowedDomain = '@lawslane.com';
                        const userEmail = user.email || '';
                        const isDesignatedSuper = isDesignatedSuperAdmin({ uid: user.uid, email: userEmail });

                        if (!userEmail.endsWith(allowedDomain) && !isDesignatedSuper) {
                            setIsAdmin(false);
                            setCurrentUser(null);
                            setUserRole(null);
                            signOut(auth);
                            router.push('/login?error=invalid_domain');
                            return;
                        }

                        if (isDesignatedSuper) {
                            const newAdminData = {
                                uid: user.uid,
                                name: user.displayName || 'Admin',
                                email: user.email,
                                role: 'admin',
                                superAdmin: true,
                                registeredAt: serverTimestamp(),
                            };
                            setDoc(userDocRef, newAdminData)
                                .then(() => {
                                    setIsAdmin(true);
                                    setCurrentUser(user);
                                    setUserRole('Super Admin');
                                })
                                .catch(serverError => {
                                    const permissionError = new FirestorePermissionError({
                                        path: userDocRef.path,
                                        operation: 'create',
                                        requestResourceData: newAdminData,
                                    });
                                    errorEmitter.emit('permission-error', permissionError);
                                    setIsAdmin(false);
                                });
                        } else {
                            setIsAdmin(false);
                            setCurrentUser(null);
                            setUserRole(null);
                            signOut(auth);
                            router.push('/login');
                        }
                    } else if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userEmail = user.email || '';

                        const isSuperAdminUser = isDesignatedSuperAdmin({ uid: user.uid, email: userEmail });

                        if (isSuperAdminUser && userData.role !== 'admin') {
                            const newAdminData = {
                                ...userData,
                                role: 'admin',
                                superAdmin: true,
                            };
                            setDoc(userDocRef, newAdminData, { merge: true })
                                .then(() => {
                                    setIsAdmin(true);
                                    setCurrentUser(user);
                                    setUserRole('Super Admin');
                                });
                        } else if (userData.role === 'admin') {
                            const isSuper = !!(isSuperAdminUser || userData.superAdmin);
                            const role = isSuper ? 'Super Admin' : 'Administrator';
                            setIsAdmin(true);
                            setCurrentUser(user);
                            setUserRole(role);
                            setIsSuperAdmin(isSuper);
                            // null = no restrictions, array = specific permissions
                            setAdminPermissions(isSuper ? null : (userData.adminPermissions ?? null));
                        } else {
                            setIsAdmin(false);
                            setCurrentUser(null);
                            setUserRole(null);

                            if (pathname.startsWith('/') && pathname !== '/login') {
                                router.push('/login');
                            }
                        }
                    }
                }).catch(error => {
                    // เดิม fail-open (setIsAdmin(true)) — ถ้าอ่าน Firestore ไม่สำเร็จ (เช่น
                    // ช่วง Firestore ล่ม/permission ผิดพลาดชั่วคราว) กลับปล่อยให้เข้าหน้า admin
                    // ได้ทั้งที่ยังไม่ยืนยันตัวตน แก้เป็น fail-closed ให้สอดคล้องกับด่านอื่น
                    console.error("Error fetching user doc in AdminLayout:", error);
                    setIsAdmin(false);
                    setCurrentUser(null);
                    setUserRole(null);
                    if (pathname !== '/login') {
                        router.push('/login');
                    }
                });
            } else {
                setIsAdmin(false);
                setCurrentUser(null);
                setUserRole(null);
                setAdminPermissions(null);
                setIsSuperAdmin(false);
                if (pathname !== '/login') {
                    router.push('/login');
                }
            }
            setIsCheckingAuth(false);
        });

        return () => unsubscribe();
    }, [areServicesAvailable, auth, firestore, router, pathname]);

    useEffect(() => {
        if (isAdmin && pathname === '/login') {
            router.push('/');
        }
    }, [isAdmin, pathname, router]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };

    // null adminPermissions = Super Admin / unrestricted
    const hasPermission = (permission?: string): boolean => {
        if (!permission) return true;           // no restriction on this item
        if (adminPermissions === null) return true;  // Super Admin sees all
        return adminPermissions.includes(permission);
    };

    const searchParams = useSearchParams();
    const isActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split('?');
        if (hrefPath === '/') return pathname === hrefPath;
        if (hrefQuery) {
            // For links with query params (e.g. ?tab=overview), match both path and query
            const params = new URLSearchParams(hrefQuery);
            const tabParam = params.get('tab');
            if (!pathname.startsWith(hrefPath)) return false;
            return searchParams.get('tab') === tabParam;
        }
        return pathname.startsWith(hrefPath);
    }

    const getMainLink = () => {
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
            return `${window.location.protocol}//${window.location.host.replace('admin.', '')}`;
        }
        const host = process.env.NODE_ENV === 'development' ? 'localhost:9002' : rootDomain;
        return `${protocol}://${host}`;
    };

    if (isCheckingAuth) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    // Fix: If on login page, render only the content (login form) without sidebar
    // This prevents the "sidebar + login page" glitch if the user is already authenticated
    if (pathname === '/login') {
        return <>{children}</>;
    }

    if (!isAdmin) {
        return <AdminLoginPage />;
    }

    return (
        <div className="grid h-screen w-full lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r border-slate-700 bg-[#0f172a] text-slate-100 lg:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b border-slate-700 px-4 lg:h-[60px] lg:px-6">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
                            <div className="relative h-8 w-8">
                                <Image
                                    src="/images/logo-lawslane-transparent-white.png"
                                    alt="Lawslane Admin"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <span className="">Lawslane Admin</span>
                        </Link>
                        <div className="ml-auto flex items-center gap-2 md:hidden">
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            <Link
                                href="/"
                                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-slate-100 transition-all hover:bg-slate-800 hover:text-white mb-2",
                                    pathname === "/" && "bg-slate-800 text-white"
                                )}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                แดชบอร์ด
                            </Link>

                            {navSections.map((section, index) => (
                                <Collapsible
                                    key={section.title}
                                    open={openSection === section.title}
                                    onOpenChange={() => toggleSection(section.title)}
                                    className="mb-2"
                                >
                                    <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 text-xs font-semibold text-slate-400 tracking-wider uppercase hover:text-white transition-colors">
                                        {section.title}
                                        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", openSection !== section.title && "-rotate-90")} />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-1 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                                        {section.items.filter(item => hasPermission(item.permission)).map((item) => (
                                            <div key={item.label} className="flex items-center gap-1">
                                                <Link
                                                    href={item.href}
                                                    className={cn("flex-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sky-300 transition-all hover:bg-slate-800 hover:text-white",
                                                        isActive(item.href) && "bg-slate-800 text-white"
                                                    )}
                                                >
                                                    {item.icon}
                                                    {item.label}
                                                </Link>
                                                {item.externalLink && (
                                                    <a
                                                        href={item.externalLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 rounded-md text-slate-500 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                                                        title="เปิดฟอร์มสำรวจ"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}

                            <div className="my-2 border-t border-slate-700" />
                            <Link
                                href={getMainLink()}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
                            >
                                <ArrowLeftCircle className="h-4 w-4" />
                                กลับไปหน้าเว็บไซต์
                            </Link>
                        </nav>
                    </div>
                    <div className="mt-auto p-4 space-y-4">
                        <div className="border-t border-slate-700 pt-4">
                            <div className="flex justify-end mb-2 px-2 md:hidden">
                                <NotificationBell />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start px-2 h-auto hover:bg-slate-800 hover:text-white text-slate-200">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-slate-600">
                                                <AvatarImage src={currentUser?.photoURL || ''} />
                                                <AvatarFallback className="bg-slate-700 text-white">{currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-left">
                                                <p className="text-sm font-semibold">{currentUser?.displayName || currentUser?.email}</p>
                                                <p className="text-xs text-slate-400">{userRole}</p>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-64" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{currentUser?.displayName}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {currentUser?.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings">
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>ตั้งค่า</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={getMainLink()}>
                                            <ArrowLeftCircle className="mr-2 h-4 w-4" />
                                            <span>กลับไปหน้าเว็บไซต์</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>ออกจากระบบ</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col overflow-auto bg-muted/40">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col bg-slate-900 text-slate-100 border-slate-700 p-0">
                            <SheetTitle className="sr-only">Admin Navigation</SheetTitle>

                            {/* Header */}
                            <div className="flex items-center gap-2 p-4 border-b border-slate-700">
                                <div className="relative h-8 w-8">
                                    <Image
                                        src="/images/logo-lawslane-transparent-white.png"
                                        alt="Lawslane Admin"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <span className="font-semibold text-white">Lawslane Admin</span>
                            </div>

                            {/* Scrollable Nav */}
                            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                                {/* Dashboard Link */}
                                {/* Dashboard Link */}
                                <Link
                                    href="/"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-slate-100 transition-all hover:bg-slate-800",
                                        pathname === "/" && "bg-slate-800 text-white font-medium"
                                    )}
                                >
                                    <LayoutDashboard className="h-5 w-5" />
                                    แดชบอร์ด
                                </Link>

                                {/* Collapsible Sections */}
                                {navSections.map((section) => (
                                    <Collapsible
                                        key={section.title}
                                        open={openSection === section.title}
                                        onOpenChange={() => toggleSection(section.title)}
                                        className=""
                                    >
                                        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 tracking-wider uppercase hover:text-white transition-colors rounded-lg hover:bg-slate-800/50">
                                            {section.title}
                                            <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", openSection === section.title && "rotate-90")} />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-1 pl-2 pt-1">
                                            {section.items.filter(item => hasPermission(item.permission)).map((item) => (
                                                <div key={item.label} className="flex items-center gap-1">
                                                    <Link
                                                        href={item.href}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={cn("flex-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sky-300 transition-all hover:bg-slate-800 hover:text-white text-sm",
                                                            isActive(item.href) && "bg-slate-800 text-white"
                                                        )}
                                                    >
                                                        {item.icon}
                                                        {item.label}
                                                    </Link>
                                                    {item.externalLink && (
                                                        <a
                                                            href={item.externalLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 rounded-md text-slate-500 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                                                            title="เปิดฟอร์มสำรวจ"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}

                                <div className="border-t border-slate-700 my-3" />
                                <Link
                                    href={getMainLink()}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
                                >
                                    <ArrowLeftCircle className="h-5 w-5" />
                                    กลับไปหน้าเว็บไซต์
                                </Link>
                            </nav>

                            {/* User Footer */}
                            <div className="p-4 border-t border-slate-700 mt-auto">
                                <div className="flex items-center gap-3 mb-3">
                                    <Avatar className="h-10 w-10 border border-slate-600">
                                        <AvatarImage src={currentUser?.photoURL || ''} />
                                        <AvatarFallback className="bg-slate-700 text-white">{currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{currentUser?.displayName || currentUser?.email}</p>
                                        <p className="text-xs text-slate-400">{userRole}</p>
                                    </div>
                                </div>
                                <Button onClick={handleLogout} variant="destructive" className="w-full">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    ออกจากระบบ
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                    </div>
                    <NotificationBell />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-8 lg:gap-6 lg:p-12">
                    {React.isValidElement(children) ? React.cloneElement(children as any, { userRole }) : children}
                </main>
            </div>
        </div >
    );
}
