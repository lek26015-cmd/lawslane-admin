
'use client';

import * as React from 'react';
import { ChevronLeft, PlusCircle, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { ALL_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';
import { isDesignatedSuperAdmin } from '@/lib/super-admin';
import { updateAdminPermissions } from '@/app/actions/admin-permissions';

// รายการสิทธิ์มาจาก src/lib/permissions.ts ที่เดียว — ตัวเดียวกับที่ auth-guard
// ใช้บังคับฝั่ง server และ nav.tsx ใช้ซ่อนเมนู เดิมประกาศซ้ำในไฟล์นี้กับหน้า new/edit
const granularPermissionsConfig = ALL_PERMISSIONS.map((id) => ({ id, label: PERMISSIONS[id] }));

export default function AdminEditAdministratorPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [admin, setAdmin] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCheckingRole, setIsCheckingRole] = React.useState(true);

  const [adminPermissions, setAdminPermissions] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!firestore || !user) return;

    const checkRoleAndFetchAdmin = async () => {
      setIsCheckingRole(true);
      try {
        // Check current user role
        const currentUserDoc = await getDoc(doc(firestore, "users", user.uid));
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data();
          const isSuperAdmin = isDesignatedSuperAdmin({ uid: user.uid, email: currentUserData.email }) || currentUserData.role === 'Super Admin' || currentUserData.superAdmin === true;

          if (!isSuperAdmin) {
            toast({
              variant: "destructive",
              title: "ไม่มีสิทธิ์เข้าถึง",
              description: "คุณไม่มีสิทธิ์ในการแก้ไขผู้ดูแลระบบ"
            });
            router.push('/settings/administrators');
            return;
          }
        } else {
          // Should not happen if logged in, but safe fallback
          router.push('/settings/administrators');
          return;
        }

        // Fetch target admin
        if (id) {
          const userDocRef = doc(firestore, "users", id as string);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            // Ensure we have the uid
            setAdmin({ ...userData, uid: userDoc.id });

            if (userData.adminPermissions) {
              setAdminPermissions(userData.adminPermissions);
            }
          } else {
            toast({
              variant: "destructive",
              title: "ไม่พบผู้ใช้",
              description: "ไม่พบข้อมูลผู้ดูแลระบบที่ต้องการแก้ไข"
            });
            router.push('/settings/administrators');
          }
        }
      } catch (error) {
        console.error("Error fetching admin:", error);
        toast({
          variant: "destructive",
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้"
        });
      } finally {
        setIsLoading(false);
        setIsCheckingRole(false);
      }
    };

    checkRoleAndFetchAdmin();
  }, [firestore, id, router, toast, user]);

  const handleGranularPermissionChange = (id: string, checked: boolean) => {
    setAdminPermissions(prev => {
      if (checked) return [...prev, id];
      return prev.filter(p => p !== id);
    });
  }

  const handleSaveChanges = async () => {
    if (!admin) return;

    setIsSaving(true);
    try {
      const result = await updateAdminPermissions(admin.uid, {
        adminPermissions,
        superAdmin: !!admin.superAdmin,
      });

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "บันทึกไม่สำเร็จ",
          description: result.message,
        });
        return;
      }

      toast({
        title: 'แก้ไขสิทธิ์สำเร็จ',
        description: `สิทธิ์การเข้าถึงของ "${admin.name || admin.email}" ได้รับการอัปเดตแล้ว — ผู้ใช้จะถูกบังคับล็อกเอาต์เพื่อให้สิทธิ์ใหม่มีผล`,
      });
      router.push('/settings/administrators');
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({
        variant: "destructive",
        title: "บันทึกไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isCheckingRole) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!admin) {
    return <div className="flex h-screen items-center justify-center">Admin not found</div>;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Link href="/settings/administrators">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            แก้ไขสิทธิ์ผู้ดูแลระบบ
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href="/settings/administrators">
              <Button variant="outline" size="sm">
                ยกเลิก
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isSaving}>
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการเปลี่ยนสิทธิ์</AlertDialogTitle>
                  <AlertDialogDescription>
                    การบันทึกจะทำให้สิทธิ์ของ "{admin.name || admin.email}" เปลี่ยนทันที และ
                    บังคับให้ผู้ใช้คนนี้ถูกล็อกเอาต์เพื่อให้ต้องล็อกอินใหม่ด้วยสิทธิ์ชุดใหม่
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveChanges}>ยืนยันบันทึก</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="grid gap-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>ข้อมูลผู้ใช้</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                  <Input id="name" type="text" className="w-full" defaultValue={admin.name || ''} disabled />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" type="email" className="w-full" defaultValue={admin.email || ''} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Super Admin Toggle Card */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>สิทธิ์ขั้นสูง</CardTitle>
              <CardDescription>การตั้งค่าสิทธิ์ระดับผู้ดูแลระบบสูงสุด</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="superAdmin"
                  checked={admin.superAdmin || (admin.role as any) === 'Super Admin'}
                  onCheckedChange={(checked) => setAdmin({ ...admin, superAdmin: !!checked })}
                />
                <Label htmlFor="superAdmin" className="font-medium">
                  ตั้งเป็น Super Admin (มีสิทธิ์ทุกอย่างและสามารถแก้ไข Admin คนอื่นได้)
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>สิทธิ์การเข้าถึง</CardTitle>
              <CardDescription>
                เลือกหน้าที่แอดมินคนนี้สามารถมองเห็นและเข้าใช้งานได้
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {granularPermissionsConfig.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-secondary/30 transition-colors">
                    <Checkbox
                      id={`page-${item.id}`}
                      checked={adminPermissions.includes(item.id)}
                      onCheckedChange={(checked) => handleGranularPermissionChange(item.id, !!checked)}
                    />
                    <Label htmlFor={`page-${item.id}`} className="font-medium cursor-pointer flex-1">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center justify-end gap-2 md:hidden">
          <Link href="/settings/administrators">
            <Button variant="outline" size="sm">
              ยกเลิก
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={isSaving}>
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันการเปลี่ยนสิทธิ์</AlertDialogTitle>
                <AlertDialogDescription>
                  การบันทึกจะทำให้สิทธิ์ของ "{admin.name || admin.email}" เปลี่ยนทันที และ
                  บังคับให้ผู้ใช้คนนี้ถูกล็อกเอาต์เพื่อให้ต้องล็อกอินใหม่ด้วยสิทธิ์ชุดใหม่
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={handleSaveChanges}>ยืนยันบันทึก</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </main>
  );
}
