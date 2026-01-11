
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser as useAuthUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, LayoutDashboard, ChevronDown } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function EducationHeaderActions() {
    const { user, isUserLoading } = useAuthUser();
    const { auth } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            toast({
                title: "ออกจากระบบแล้ว",
                description: "ขอบคุณที่ใช้บริการ Lawlanes Education",
            });
            router.push('/education/login');
        }
    };

    if (isUserLoading) return null;

    if (!user) {
        return (
            <div className="flex items-center gap-2">
                <Link href="/education/login">
                    <Button variant="ghost" className="font-medium text-slate-600 hover:text-indigo-600">
                        เข้าสู่ระบบ
                    </Button>
                </Link>
                <Link href="/education/signup">
                    <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm">
                        สมัครสมาชิก
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                        <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/education/my-learning')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    การเรียนรู้ของฉัน
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/education/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    จัดการบัญชี
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    ออกจากระบบ
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
