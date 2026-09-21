
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftCircle, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createAdminUser } from '@/app/actions/admin-management';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { ALL_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';
import { isDesignatedSuperAdmin } from '@/lib/super-admin';

// รายการสิทธิ์มาจาก src/lib/permissions.ts ที่เดียว — ตัวเดียวกับที่ auth-guard
// ใช้บังคับฝั่ง server และ nav.tsx ใช้ซ่อนเมนู เดิมประกาศซ้ำในไฟล์นี้กับหน้า new/edit
const granularPermissionsConfig = ALL_PERMISSIONS.map((id) => ({ id, label: PERMISSIONS[id] }));

export default function NewAdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('admin');
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!firestore || !user) return;

    const checkRole = async () => {
      setIsCheckingRole(true);
      try {
        const currentUserDoc = await getDoc(doc(firestore, "users", user.uid));
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data();
          const isSuperAdmin = isDesignatedSuperAdmin({ uid: user.uid, email: currentUserData.email }) || currentUserData.role === 'Super Admin' || currentUserData.superAdmin === true;

          if (!isSuperAdmin) {
            toast({
              variant: "destructive",
              title: "ไม่มีสิทธิ์เข้าถึง",
              description: "คุณไม่มีสิทธิ์ในการสร้างผู้ดูแลระบบ"
            });
            router.push('/settings/administrators');
          }
        } else {
          router.push('/settings/administrators');
        }
      } catch (error) {
        console.error("Error checking role:", error);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkRole();
  }, [firestore, user, router, toast]);

  const handleGranularPermissionChange = (id: string, checked: boolean) => {
    setAdminPermissions(prev => {
      if (checked) return [...prev, id];
      return prev.filter(p => p !== id);
    });
  }

  async function handleSubmit(formData: FormData) {
    if (!firestore) return;
    setIsLoading(true);
    formData.append('role', role);
    formData.append('adminPermissions', JSON.stringify(adminPermissions));

    try {
      // createAdminUser (server action) สร้างทั้ง Auth user + custom claim + Firestore doc
      // ในคำขอเดียว รวมถึง adminPermissions ที่ส่งมาด้วย formData ข้างบนแล้ว
      const result = await createAdminUser(null, formData);

      if (result.success) {
        toast({
          title: "สร้างผู้ดูแลระบบสำเร็จ",
          description: "บัญชีผู้ดูแลระบบถูกสร้างเรียบร้อยแล้ว กรุณาตรวจสอบสิทธิ์การใช้งานอีกครั้ง",
        });
        router.push('/settings/administrators');
      } else {
        toast({
          variant: "destructive",
          title: "สร้างไม่สำเร็จ",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingRole) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-2xl gap-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings/administrators">
              <ArrowLeftCircle className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">เพิ่มผู้ดูแลระบบ</h1>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-2xl">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>ข้อมูลผู้ดูแลระบบใหม่</CardTitle>
            <CardDescription>
              สร้างบัญชีสำหรับเจ้าหน้าที่ Lawslane (เฉพาะ @lawslane.com)
            </CardDescription>
          </CardHeader>
          <form action={handleSubmit}>
            <CardContent className="grid gap-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex gap-3">
                <ShieldAlert className="h-5 w-5 text-yellow-600" />
                <div className="text-sm text-yellow-700">
                  <p className="font-semibold">ข้อจำกัดความปลอดภัย</p>
                  <p>อีเมลต้องลงท้ายด้วย <strong>@lawslane.com</strong> เท่านั้น</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <Input id="name" name="name" placeholder="สมชาย ใจดี" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">อีเมล (@lawslane.com)</Label>
                <Input id="email" name="email" type="email" placeholder="name@lawslane.com" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">ระดับสิทธิ์</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">ผู้ดูแลทั่วไป (Admin)</SelectItem>
                    <SelectItem value="super_admin">ผู้ดูแลสูงสุด (Super Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">กำหนดสิทธิ์การเข้าถึงเมนู (หน้าเว็บ)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {granularPermissionsConfig.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-secondary/30 transition-colors">
                      <Checkbox
                        id={`page-${item.id}`}
                        checked={adminPermissions.includes(item.id)}
                        onCheckedChange={(checked) => handleGranularPermissionChange(item.id, !!checked)}
                        disabled={role === 'super_admin'}
                      />
                      <Label htmlFor={`page-${item.id}`} className="font-medium cursor-pointer flex-1">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
            <CardFooter className="justify-end border-t p-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                สร้างบัญชี
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
