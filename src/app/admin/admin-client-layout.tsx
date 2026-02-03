'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Gavel,
    LayoutDashboard,
    Landmark,
    Settings,
    ShieldCheck,
    Ticket,
    Users2,
    Megaphone,
    FileText,
    ArrowLeftCircle,
    LogOut,
    ChevronDown,
    Menu,
    Mail,
    LayoutTemplate,
    Database,
    FileSignature,
    Building2,
    Briefcase,
    FileEdit,
    Scale,
    BrainCircuit,
    Library,
    UserCheck,
    ChevronRight,
    GraduationCap,
    Book,
    FileQuestion,
    Package
} from 'lucide-react';
import React, { useState, useEffect, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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


export function AdminClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const firebaseContext = useContext(FirebaseContext);
    const { auth, firestore, areServicesAvailable } = firebaseContext || {};

    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // State for collapsible sections, default "ภาพรวม" open
    const [openSection, setOpenSection] = useState<string | null>("ภาพรวม");

    const toggleSection = (title: string) => {
        setOpenSection(prev => prev === title ? null : title);
    };

    useEffect(() => {
        if (!areServicesAvailable || !auth || !firestore) {
            setIsCheckingAuth(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(firestore, "users", user.uid);

                getDoc(userDocRef).then(userDoc => {
                    if (!userDoc.exists()) {
                        const designatedSuperAdminUID = 'wS9w7ysNYUajNsBYZ6C7n2Afe9H3';
                        const designatedSuperAdminEmail = 'lek.26015@gmail.com';

                        const allowedDomain = '@lawslane.com';
                        const userEmail = user.email || '';

                        if (!userEmail.endsWith(allowedDomain) && userEmail !== designatedSuperAdminEmail) {
                            setIsAdmin(false);
                            setCurrentUser(null);
                            setUserRole(null);
                            signOut(auth);
                            router.push('/admin/login?error=invalid_domain');
                            return;
                        }

                        if (user.uid === designatedSuperAdminUID || userEmail === designatedSuperAdminEmail) {
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
                            router.push('/admin/login');
                        }
                    } else if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const designatedSuperAdminUID = 'wS9w7ysNYUajNsBYZ6C7n2Afe9H3';
                        const designatedSuperAdminEmail = 'lek.26015@gmail.com';
                        const userEmail = user.email || '';

                        const isSuperAdminUser = (user.uid === designatedSuperAdminUID) || (userEmail === designatedSuperAdminEmail);

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
                            const role = userData.superAdmin ? 'Super Admin' : 'Administrator';
                            setIsAdmin(true);
                            setCurrentUser(user);
                            setUserRole(role);
                        } else {
                            setIsAdmin(false);
                            setCurrentUser(null);
                            setUserRole(null);

                            if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
                                router.push('/admin/login');
                            }
                        }
                    }
                }).catch(error => {
                    console.error("Error fetching user doc in AdminLayout:", error);
                    setIsAdmin(true);
                    setUserRole('Guest (Error)');
                });
            } else {
                setIsAdmin(false);
                setCurrentUser(null);
                setUserRole(null);
                if (pathname !== '/admin/login') {
                    router.push('/admin/login');
                }
            }
            setIsCheckingAuth(false);
        });

        return () => unsubscribe();
    }, [areServicesAvailable, auth, firestore, router, pathname]);

    useEffect(() => {
        if (isAdmin && pathname === '/admin/login') {
            router.push('/admin');
        }
    }, [isAdmin, pathname, router]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/admin/login');
        }
    };

    type NavItem = {
        href: string;
        icon: React.ReactNode;
        label: string;
    };

    type NavSection = {
        title: string;
        items: NavItem[];
    };

    const navSections: NavSection[] = [
        {
            title: "จัดการผู้ใช้งาน",
            items: [
                { href: "/admin/customers", icon: <Users2 className="h-4 w-4" />, label: "ลูกค้า" },
                { href: "/admin/lawyers", icon: <UserCheck className="h-4 w-4" />, label: "ทนายความ" },
                { href: "/admin/lawyer-registry", icon: <Database className="h-4 w-4" />, label: "ฐานข้อมูลทนาย" },
            ]
        },
        ...(userRole === 'Super Admin' ? [{
            title: "ระบบการศึกษา (Education)",
            items: [
                { href: "/admin/education", icon: <GraduationCap className="h-4 w-4" />, label: "ภาพรวม Education" },
                { href: "/admin/education/books", icon: <Book className="h-4 w-4" />, label: "จัดการหนังสือ" },
                { href: "/admin/education/exams", icon: <FileQuestion className="h-4 w-4" />, label: "จัดการข้อสอบ" },
                { href: "/admin/education/orders", icon: <Package className="h-4 w-4" />, label: "รายการสั่งซื้อ" },
            ]
        }] : []),
        {
            title: "คำขอใช้บริการ",
            items: [
                { href: "/admin/contract-requests", icon: <FileSignature className="h-4 w-4" />, label: "คำขอร่างสัญญา" },
                { href: "/admin/registration-requests", icon: <Building2 className="h-4 w-4" />, label: "คำขอจดทะเบียน" },
                { href: "/admin/sme-requests", icon: <Briefcase className="h-4 w-4" />, label: "คำขอ SME" },
            ]
        },
        {
            title: "เนื้อหาและการตลาด",
            items: [
                { href: "/admin/landing-pages", icon: <LayoutTemplate className="h-4 w-4" />, label: "Landing Pages" },
                { href: "/admin/ads", icon: <Megaphone className="h-4 w-4" />, label: "จัดการโฆษณา" },
                { href: "/admin/content", icon: <FileEdit className="h-4 w-4" />, label: "จัดการเนื้อหา" },
                { href: "/admin/forms", icon: <FileText className="h-4 w-4" />, label: "แบบฟอร์มกฎหมาย" },
                { href: "/admin/legal", icon: <Scale className="h-4 w-4" />, label: "เอกสารทางกฎหมาย" },
                { href: "/admin/knowledge", icon: <BrainCircuit className="h-4 w-4" />, label: "คลังความรู้ AI" },
            ]
        },
        {
            title: "ระบบและสนับสนุน",
            items: [
                { href: "/admin/financials", icon: <Landmark className="h-4 w-4" />, label: "การเงิน" },
                { href: "/admin/tickets", icon: <Ticket className="h-4 w-4" />, label: "Ticket ช่วยเหลือ" },
                { href: "/admin/email", icon: <Mail className="h-4 w-4" />, label: "ระบบอีเมล" },
            ]
        }
    ];

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === href;
        return pathname.startsWith(href);
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
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (!isAdmin) {
        return <AdminLoginPage />;
    }

    return (
        <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r border-slate-700 bg-[#0f172a] text-slate-100 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b border-slate-700 px-4 lg:h-[60px] lg:px-6">
                        <Link href="/admin" className="flex items-center gap-2 font-semibold text-white">
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
                                href="/admin"
                                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-slate-100 transition-all hover:bg-slate-800 hover:text-white mb-2",
                                    pathname === "/admin" && "bg-slate-800 text-white"
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
                                        {section.items.map((item) => (
                                            <Link
                                                key={item.label}
                                                href={item.href}
                                                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sky-300 transition-all hover:bg-slate-800 hover:text-white",
                                                    isActive(item.href) && "bg-slate-800 text-white"
                                                )}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </Link>
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
                                        <Link href="/admin/settings">
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
                            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
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
                                    href="/admin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-slate-100 transition-all hover:bg-slate-800",
                                        pathname === "/admin" && "bg-slate-800 text-white font-medium"
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
                                            {section.items.map((item) => (
                                                <Link
                                                    key={item.label}
                                                    href={item.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sky-300 transition-all hover:bg-slate-800 hover:text-white text-sm",
                                                        isActive(item.href) && "bg-slate-800 text-white"
                                                    )}
                                                >
                                                    {item.icon}
                                                    {item.label}
                                                </Link>
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
