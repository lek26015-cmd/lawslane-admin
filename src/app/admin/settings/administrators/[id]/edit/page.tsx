
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
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

const permissionsConfig = [
  { id: 'customers', label: 'ลูกค้า', actions: ['view', 'create', 'edit', 'delete', 'download'] },
  { id: 'lawyers', label: 'ทนายความ', actions: ['view', 'create', 'edit', 'delete', 'download'] },
  { id: 'financials', label: 'การเงิน', actions: ['view', 'download'] },
  { id: 'tickets', label: 'Ticket ช่วยเหลือ', actions: ['view', 'reply'] },
  { id: 'ads', label: 'จัดการโฆษณา', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'content', label: 'จัดการเนื้อหา', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'settings', label: 'ตั้งค่าระบบ', actions: ['view', 'edit'] },
];

const actionLabels: { [key: string]: string } = {
  view: 'ดู',
  create: 'สร้าง',
  edit: 'แก้ไข',
  delete: 'ลบ',
  download: 'ดาวน์โหลด',
  reply: 'ตอบกลับ',
};

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

  // Mock permissions state for the selected admin
  // In a real app, this would also be fetched from Firestore if stored separately
  const [permissions, setPermissions] = React.useState<Record<string, string[]>>({
    customers: ['view', 'edit'],
    lawyers: ['view'],
    tickets: ['view', 'reply']
  });

  React.useEffect(() => {
    if (!firestore || !user) return;

    const checkRoleAndFetchAdmin = async () => {
      setIsCheckingRole(true);
      try {
        // Check current user role
        const currentUserDoc = await getDoc(doc(firestore, "users", user.uid));
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data();
          const isSuperAdmin = currentUserData.role === 'Super Admin' || currentUserData.superAdmin === true;

          if (!isSuperAdmin) {
            toast({
              variant: "destructive",
              title: "ไม่มีสิทธิ์เข้าถึง",
              description: "คุณไม่มีสิทธิ์ในการแก้ไขผู้ดูแลระบบ"
            });
            router.push('/admin/settings/administrators');
            return;
          }
        } else {
          // Should not happen if logged in, but safe fallback
          router.push('/admin/settings/administrators');
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

            // Load permissions if they exist
            if (userData.permissions) {
              setPermissions(userData.permissions);
            }
          } else {
            toast({
              variant: "destructive",
              title: "ไม่พบผู้ใช้",
              description: "ไม่พบข้อมูลผู้ดูแลระบบที่ต้องการแก้ไข"
            });
            router.push('/admin/settings/administrators');
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

  const handlePermissionChange = (menuId: string, action: string, checked: boolean) => {
    setPermissions(prev => {
      const currentActions = prev[menuId] || [];
      if (checked) {
        return { ...prev, [menuId]: [...currentActions, action] };
      } else {
        return { ...prev, [menuId]: currentActions.filter(a => a !== action) };
      }
    });
  }

  const handleSaveChanges = async () => {
    if (!admin || !firestore) return;

    setIsSaving(true);
    try {
      const userDocRef = doc(firestore, "users", admin.uid);
      await updateDoc(userDocRef, { permissions });

      toast({
        title: 'แก้ไขสิทธิ์สำเร็จ',
        description: `สิทธิ์การเข้าถึงของ "${admin.name || admin.email}" ได้รับการอัปเดตแล้ว`,
      });
      router.push('/admin/settings/administrators');
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
          <Link href="/admin/settings/administrators">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            แก้ไขสิทธิ์ผู้ดูแลระบบ
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href="/admin/settings/administrators">
              <Button variant="outline" size="sm">
                ยกเลิก
              </Button>
            </Link>
            <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </div>
        </div>
        <div className="grid gap-6">
          <Card>
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

          <Card>
            <CardHeader>
              <CardTitle>กำหนดสิทธิ์การเข้าถึง</CardTitle>
              <CardDescription>
                เลือกเมนูและกำหนดการกระทำที่ <span className="font-semibold">{admin.name || admin.email}</span> สามารถทำได้
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {permissionsConfig.map((menu, index) => (
                  <React.Fragment key={menu.id}>
                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-start">
                      <Label className="font-semibold text-base pt-3">{menu.label}</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-secondary/50">
                        {menu.actions.map(action => (
                          <div key={action} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${menu.id}-${action}`}
                              checked={permissions[menu.id]?.includes(action)}
                              onCheckedChange={(checked) => handlePermissionChange(menu.id, action, !!checked)}
                            />
                            <Label htmlFor={`${menu.id}-${action}`} className="font-normal text-sm">
                              {actionLabels[action]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {index < permissionsConfig.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex items-center justify-end gap-2 md:hidden">
          <Link href="/admin/settings/administrators">
            <Button variant="outline" size="sm">
              ยกเลิก
            </Button>
          </Link>
          <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
      </div>
    </main>
  );
}
