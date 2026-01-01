
'use client'

import * as React from 'react'
import {
  ChevronLeft,
  Upload,
  Languages,
  Loader2,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getLawyerById } from '@/lib/data'
import { useFirebase } from '@/firebase'
import type { LawyerProfile } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox'

import { doc, updateDoc } from 'firebase/firestore';
import { uploadToR2 } from '@/app/actions/upload-r2';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { translateToMultipleLanguages } from '@/app/actions/translate';

export default function AdminLawyerEditPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params
  const { toast } = useToast()
  const { firestore } = useFirebase();

  const [lawyer, setLawyer] = React.useState<LawyerProfile | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState<{
    description: boolean;
    education: boolean;
    experience: boolean;
  }>({ description: false, education: false, experience: false });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTranslate = async (field: 'description' | 'education' | 'experience') => {
    if (!lawyer) return;

    const thaiText = lawyer[field];
    if (!thaiText || thaiText.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "ไม่มีข้อความภาษาไทย",
        description: "กรุณากรอกข้อความภาษาไทยก่อนกดแปล",
      });
      return;
    }

    setIsTranslating(prev => ({ ...prev, [field]: true }));

    try {
      const result = await translateToMultipleLanguages(thaiText);

      if (field === 'description') {
        setLawyer({
          ...lawyer,
          descriptionEn: result.english,
          descriptionZh: result.chinese
        });
      } else if (field === 'education') {
        setLawyer({
          ...lawyer,
          educationEn: result.english,
          educationZh: result.chinese
        });
      } else if (field === 'experience') {
        setLawyer({
          ...lawyer,
          experienceEn: result.english,
          experienceZh: result.chinese
        });
      }

      toast({
        title: "แปลสำเร็จ",
        description: "แปลข้อความเป็นภาษาอังกฤษและจีนแล้ว",
      });
    } catch (error) {
      console.error("Translation failed:", error);
      toast({
        variant: "destructive",
        title: "แปลไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการแปลภาษา กรุณาลองใหม่",
      });
    } finally {
      setIsTranslating(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: "destructive",
          title: "ไฟล์มีขนาดใหญ่เกินไป",
          description: `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน ${MAX_FILE_SIZE_MB}MB`,
        });
        e.target.value = '';
        return;
      }

      try {
        toast({ title: "กำลังอัปโหลดรูปภาพ...", description: "Uploading to R2..." });

        const formData = new FormData();
        formData.append('file', file);
        const url = await uploadToR2(formData, 'lawyers');

        setLawyer(prev => prev ? { ...prev, imageUrl: url } : null);
        toast({ title: "รูปภาพพร้อมแล้ว", description: "กดบันทึกเพื่อยืนยันการเปลี่ยนแปลง" });
      } catch (error) {
        console.error("Upload failed:", error);
        toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปโหลดรูปภาพได้" });
      }
    }
  };

  React.useEffect(() => {
    if (!firestore || !id) return;
    getLawyerById(firestore, id as string).then(l => setLawyer(l || null));
  }, [id, firestore]);

  const handleSaveChanges = async () => {
    if (!lawyer || !firestore || !id) return;

    setIsSaving(true);
    try {
      const lawyerRef = doc(firestore, 'lawyerProfiles', id as string);
      await updateDoc(lawyerRef, {
        name: lawyer.name,
        status: lawyer.status,
        specialty: lawyer.specialty,
        imageUrl: lawyer.imageUrl,
        // Multi-language fields
        description: lawyer.description,
        descriptionEn: lawyer.descriptionEn || null,
        descriptionZh: lawyer.descriptionZh || null,
        education: lawyer.education,
        educationEn: lawyer.educationEn || null,
        educationZh: lawyer.educationZh || null,
        experience: lawyer.experience,
        experienceEn: lawyer.experienceEn || null,
        experienceZh: lawyer.experienceZh || null,
      });

      toast({
        title: "บันทึกข้อมูลสำเร็จ",
        description: `ข้อมูลของทนาย ${lawyer.name} ได้รับการอัปเดตแล้ว`,
      })
      router.push(`/admin/lawyers/${id}`);
    } catch (error) {
      console.error("Error updating lawyer:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!lawyer) {
    return <div>Loading...</div>
  }

  const allSpecialties = ['คดีฉ้อโกง SMEs', 'คดีแพ่งและพาณิชย์', 'การผิดสัญญา', 'ทรัพย์สินทางปัญญา', 'กฎหมายแรงงาน', 'อสังหาริมทรัพย์'];


  return (
    <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-8">
      <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/lawyers/${id}`}>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={isSaving}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">กลับ</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            แก้ไขข้อมูลทนายความ
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href={`/admin/lawyers/${id}`}>
              <Button variant="outline" size="sm" disabled={isSaving}>
                ยกเลิก
              </Button>
            </Link>
            <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </div>
        </div>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>ข้อมูลโปรไฟล์</CardTitle>
            <CardDescription>
              จัดการข้อมูลส่วนตัวและสถานะของทนายความ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="picture">รูปโปรไฟล์</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={lawyer.imageUrl} />
                    <AvatarFallback>{lawyer.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                    <Upload className="h-4 w-4 mr-2" />
                    เปลี่ยนรูป
                  </Button>
                </div>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <Input
                  id="name"
                  type="text"
                  className="w-full"
                  value={lawyer.name}
                  onChange={(e) => setLawyer({ ...lawyer, name: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="status">สถานะ</Label>
                <Select
                  value={lawyer.status}
                  onValueChange={(val: any) => setLawyer({ ...lawyer, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                    <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                    <SelectItem value="rejected">ถูกปฏิเสธ</SelectItem>
                    <SelectItem value="suspended">ถูกระงับ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label>ความเชี่ยวชาญ</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allSpecialties.map(spec => (
                    <div key={spec} className="flex items-center space-x-2 p-2 rounded-md bg-secondary/50">
                      <Checkbox
                        id={`spec-${spec}`}
                        checked={lawyer.specialty.includes(spec)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setLawyer({ ...lawyer, specialty: [...lawyer.specialty, spec] });
                          } else {
                            setLawyer({ ...lawyer, specialty: lawyer.specialty.filter(s => s !== spec) });
                          }
                        }}
                      />
                      <Label htmlFor={`spec-${spec}`} className="text-sm font-normal">{spec}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multi-language Description */}
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>เกี่ยวกับ (แยกตามภาษา)</CardTitle>
                <CardDescription>
                  ข้อความแนะนำตัวที่จะแสดงในหน้าโปรไฟล์
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTranslate('description')}
                disabled={isTranslating.description || !lawyer.description}
              >
                {isTranslating.description ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4 mr-2" />
                )}
                แปลอัตโนมัติ
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇹🇭</span>
                  <Label>ภาษาไทย</Label>
                </div>
                <Textarea
                  placeholder="คำอธิบายภาษาไทย"
                  value={lawyer.description || ''}
                  onChange={(e) => setLawyer({ ...lawyer, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇬🇧</span>
                  <Label>English</Label>
                </div>
                <Textarea
                  placeholder="English description (optional)"
                  value={lawyer.descriptionEn || ''}
                  onChange={(e) => setLawyer({ ...lawyer, descriptionEn: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇨🇳</span>
                  <Label>中文</Label>
                </div>
                <Textarea
                  placeholder="中文描述 (选填)"
                  value={lawyer.descriptionZh || ''}
                  onChange={(e) => setLawyer({ ...lawyer, descriptionZh: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multi-language Education */}
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>การศึกษา (แยกตามภาษา)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTranslate('education')}
                disabled={isTranslating.education || !lawyer.education}
              >
                {isTranslating.education ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4 mr-2" />
                )}
                แปลอัตโนมัติ
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇹🇭</span>
                  <Label>ภาษาไทย</Label>
                </div>
                <Textarea
                  placeholder="ข้อมูลการศึกษาภาษาไทย"
                  value={lawyer.education || ''}
                  onChange={(e) => setLawyer({ ...lawyer, education: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇬🇧</span>
                  <Label>English</Label>
                </div>
                <Textarea
                  placeholder="Education info in English (optional)"
                  value={lawyer.educationEn || ''}
                  onChange={(e) => setLawyer({ ...lawyer, educationEn: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇨🇳</span>
                  <Label>中文</Label>
                </div>
                <Textarea
                  placeholder="学历信息 (选填)"
                  value={lawyer.educationZh || ''}
                  onChange={(e) => setLawyer({ ...lawyer, educationZh: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multi-language Experience */}
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ประสบการณ์ (แยกตามภาษา)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTranslate('experience')}
                disabled={isTranslating.experience || !lawyer.experience}
              >
                {isTranslating.experience ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4 mr-2" />
                )}
                แปลอัตโนมัติ
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇹🇭</span>
                  <Label>ภาษาไทย</Label>
                </div>
                <Textarea
                  placeholder="ประสบการณ์การทำงานภาษาไทย"
                  value={lawyer.experience || ''}
                  onChange={(e) => setLawyer({ ...lawyer, experience: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇬🇧</span>
                  <Label>English</Label>
                </div>
                <Textarea
                  placeholder="Work experience in English (optional)"
                  value={lawyer.experienceEn || ''}
                  onChange={(e) => setLawyer({ ...lawyer, experienceEn: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇨🇳</span>
                  <Label>中文</Label>
                </div>
                <Textarea
                  placeholder="工作经验 (选填)"
                  value={lawyer.experienceZh || ''}
                  onChange={(e) => setLawyer({ ...lawyer, experienceZh: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2 md:hidden">
          <Link href={`/admin/lawyers/${id}`}>
            <Button variant="outline" size="sm" disabled={isSaving}>
              ยกเลิก
            </Button>
          </Link>
          <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </Button>
        </div>
      </div>
    </main>
  )
}
