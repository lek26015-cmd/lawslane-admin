
'use client';

import Link from 'next/link';
import {
    Gavel,
    Home,
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
    Mail
} from 'lucide-react';
import React, { useState, useEffect, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FirebaseContext, FirebaseContextState, errorEmitter, FirestorePermissionError } from '@/firebase';
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


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const firebaseContext = useContext(FirebaseContext);
    const { auth, firestore, areServicesAvailable } = firebaseContext || {};

    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

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

                        // Allow basic access if domain is allowed OR if it's the specific super admin email
                        if (!userEmail.endsWith(allowedDomain) && userEmail !== designatedSuperAdminEmail) {
                            // Invalid domain, sign out
                            setIsAdmin(false);
                            setCurrentUser(null);
                            setUserRole(null);
                            signOut(auth);
                            router.push('/admin/login?error=invalid_domain');
                            return;
                        }

                        // Check UID OR Email for Super Admin stats
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
                                    // After setting the doc, we can assume the role.
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
                                    // Set state to non-admin because creation failed
                                    setIsAdmin(false);
                                });
                        } else {
                            // Not the designated admin, sign them out.
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

                        // Check if it's super admin by UID OR Email
                        const isSuperAdminUser = (user.uid === designatedSuperAdminUID) || (userEmail === designatedSuperAdminEmail);

                        if (isSuperAdminUser && userData.role !== 'admin') {
                            // Auto-promote if it's the super admin but has wrong role
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
                            // User exists but is not an admin and not the super admin
                            // Double check if they should be allowed (e.g. maybe domain logic?)
                            // But generally if role != admin, they shouldn't be here.

                            setIsAdmin(false);
                            setCurrentUser(null);
                            setUserRole(null);

                            // Prevent redirect loops
                            if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
                                router.push('/admin/login');
                            }
                        }
                    }
                }).catch(error => {
                    console.error("Error fetching user doc in AdminLayout:", error);
                    // Do not emit error to avoid global crash/toast storm
                    // Just log it and let the UI handle the non-admin state

                    // Special handling: If it's a permission error, we might still want to let them in 
                    // if they are the super admin, so they can fix it via the button in NewAdPage.
                    // But for now, just don't crash.
                    setIsAdmin(true); // Allow rendering to let the "Fix Admin Role" button work in children
                    setUserRole('Guest (Error)');
                });
            } else {
                // No user logged in
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

    // Redirect if already admin and on login page
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

    const navItems = [
        { href: "/", icon: <Home className="h-4 w-4" />, label: "แดชบอร์ด" },
        { href: "/customers", icon: <Users2 className="h-4 w-4" />, label: "ลูกค้า" },
        { href: "/lawyers", icon: <ShieldCheck className="h-4 w-4" />, label: "ทนายความ" },
        { href: "/financials", icon: <Landmark className="h-4 w-4" />, label: "การเงิน" },
        { href: "/tickets", icon: <Ticket className="h-4 w-4" />, label: "Ticket ช่วยเหลือ" },
        { href: "/ads", icon: <Megaphone className="h-4 w-4" />, label: "จัดการโฆษณา" },
        { href: "/email", icon: <Mail className="h-4 w-4" />, label: "ระบบอีเมล" },
        { href: "/content", icon: <FileText className="h-4 w-4" />, label: "จัดการเนื้อหา" },
        { href: "/knowledge", icon: <Landmark className="h-4 w-4" />, label: "คลังความรู้ AI" },
    ];

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === href;
        return pathname.startsWith(href);
    }

    const getMainLink = () => {
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const host = process.env.NODE_ENV === 'development' ? 'localhost:3000' : rootDomain;
        return `${protocol}://${host}`;
    };

    if (isCheckingAuth) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!isAdmin) {
        return <AdminLoginPage />;
    }

    return (
        <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link href="/admin" className="flex items-center gap-2 font-semibold">
                            <Gavel className="h-6 w-6" />
                            <span className="">Lawslane Admin</span>
                        </Link>
                        <div className="ml-auto flex items-center gap-2 md:hidden">
                            {/* Mobile Bell could go here if not in sidebar */}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                        isActive(item.href) && "bg-muted text-primary"
                                    )}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            ))}

                            <div className="my-2 border-t border-border/50" />
                            <Link
                                href={getMainLink()}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                            >
                                <ArrowLeftCircle className="h-4 w-4" />
                                กลับไปหน้าเว็บไซต์
                            </Link>
                        </nav>
                    </div>
                    <div className="mt-auto p-4 space-y-4">
                        <div className="border-t pt-4">
                            <div className="flex justify-end mb-2 px-2 md:hidden">
                                <NotificationBell />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start px-2 h-auto">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={currentUser?.photoURL || ''} />
                                                <AvatarFallback>{currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-left">
                                                <p className="text-sm font-semibold">{currentUser?.displayName || currentUser?.email}</p>
                                                <p className="text-xs text-muted-foreground">{userRole}</p>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col">
                            <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                            <nav className="grid gap-2 text-lg font-medium">
                                <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold mb-4">
                                    <Gavel className="h-6 w-6" />
                                    <span className="sr-only">Lawslane Admin</span>
                                </Link>
                                {navItems.map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={cn("mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                                            isActive(item.href) && "bg-muted text-foreground"
                                        )}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </Link>
                                ))}

                                <div className="my-2 border-t border-border/50" />
                                <Link
                                    href={getMainLink()}
                                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeftCircle className="h-5 w-5" />
                                    กลับไปหน้าเว็บไซต์
                                </Link>
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                        {/* Add search or breadcrumbs here if needed */}
                    </div>
                    <NotificationBell />
                </header>
                {React.isValidElement(children) ? React.cloneElement(children as any, { userRole }) : children}
            </div>
        </div >
    );
}
