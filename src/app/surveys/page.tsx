
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  FileText, 
  Search, 
  Eye, 
  Filter,
  Download,
  ClipboardList,
  ChevronRight,
  Info,
  Building,
  Users,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { UnifiedSurveyResponse } from '@/types/survey';

const ROLE_MAP: Record<string, string> = {
  executive: 'ผู้บริหาร/Founder',
  inhouse_legal: 'ที่ปรึกษากฎหมาย',
  operations: 'ฝ่ายปฏิบัติการ',
  other: 'อื่นๆ'
};

const BUSINESS_TYPE_MAP: Record<string, string> = {
  service: 'บริการ',
  manufacturing: 'การผลิต',
  retail: 'ค้าปลีก-ค้าส่ง',
  tech: 'เทคโนโลยี',
  other: 'อื่นๆ'
};

const CHALLENGE_MAP: Record<string, string> = {
  drafting: 'ร่างสัญญา',
  reviewing: 'ตรวจสัญญา',
  labor: 'แรงงาน',
  ip: 'ทรัพย์สินทางปัญญา',
  debt: 'หนี้สิน',
  approval: 'อนุมัติช้า',
  storage: 'การจัดเก็บ',
  compliance: 'Compliance'
};

export default function UnifiedSurveysPage() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedResponse, setSelectedResponse] = React.useState<UnifiedSurveyResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  // Firestore query
  const surveyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'unified_surveys'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: surveys, isLoading } = useCollection<UnifiedSurveyResponse>(surveyQuery);

  // Filtered surveys
  const filteredSurveys = React.useMemo(() => {
    if (!surveys) return [];
    return surveys.filter(s => 
      s.respondentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.businessType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [surveys, searchTerm]);

  const handleViewDetails = (response: UnifiedSurveyResponse) => {
    setSelectedResponse(response);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Unified Survey Responses</h1>
          <p className="text-muted-foreground">
            ข้อมูลรวมจากแบบสอบถาม Product Research (SME & Corporate)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ หรือประเภทธุรกิจ..."
                className="pl-9 bg-slate-50 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>ทั้งหมด {filteredSurveys.length} รายการ</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[180px]">วันที่</TableHead>
                  <TableHead>ผู้ให้ข้อมูล</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>ธุรกิจ</TableHead>
                  <TableHead>สัญญา/เดือน</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredSurveys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ClipboardList className="h-12 w-12 text-slate-200" />
                        <p className="text-slate-500 font-medium">ไม่พบข้อมูลแบบสำรวจ</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSurveys.map((survey) => (
                    <TableRow key={survey.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-sm">
                        {survey.createdAt ? format(survey.createdAt.toDate(), 'dd MMM yy HH:mm', { locale: th }) : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{survey.respondentName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {ROLE_MAP[survey.role] || survey.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {BUSINESS_TYPE_MAP[survey.businessType] || survey.businessType}
                        </div>
                        <div className="text-xs text-muted-foreground">{survey.businessSize}</div>
                      </TableCell>
                      <TableCell className="text-sm">{survey.contractVolume}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleViewDetails(survey)}
                        >
                          <Eye className="h-4 w-4" />
                          ดูรายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-8 bg-[#002f4b] text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                <ClipboardList className="h-8 w-8 text-blue-300" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Unified Survey Result</DialogTitle>
                <DialogDescription className="text-blue-200 opacity-80">
                  ID: {selectedResponse?.id} | วันที่ {selectedResponse?.createdAt ? format(selectedResponse.createdAt.toDate(), 'dd MMMM yyyy HH:mm', { locale: th }) : '-'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedResponse && (
            <div className="p-8 space-y-10">
              {/* Profile */}
              <section>
                <SectionHeader icon={<Info className="h-5 w-5" />} title="ข้อมูลพื้นฐานธุรกิจ" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                  <DetailItem label="ชื่อ-นามสกุล/ตำแหน่ง" value={selectedResponse.respondentName} />
                  <DetailItem label="บทบาทหลัก" value={ROLE_MAP[selectedResponse.role] || selectedResponse.role} />
                  <DetailItem 
                    label="ประเภทธุรกิจ" 
                    value={
                      selectedResponse.businessType === 'other' 
                        ? `อื่นๆ (${selectedResponse.businessTypeOther})` 
                        : BUSINESS_TYPE_MAP[selectedResponse.businessType] || selectedResponse.businessType
                    } 
                  />
                  <DetailItem label="ขนาดธุรกิจ" value={selectedResponse.businessSize} />
                  <DetailItem label="ระยะเวลาทำธุรกิจ" value={selectedResponse.businessDuration} />
                  <DetailItem label="สัญญาต่อเดือน" value={selectedResponse.contractVolume} />
                </div>
              </section>

              <hr />

              {/* Challenges */}
              <section>
                <SectionHeader icon={<ShieldCheck className="h-5 w-5" />} title="ความท้าทายและการทำงาน" />
                <div className="space-y-6 mt-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-3">ปัญหาทางกฎหมายและความล่าช้าที่พบ</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResponse.challenges.map((c) => (
                        <Badge key={c} variant="secondary" className="bg-slate-100 text-slate-700">
                          {c === 'other' ? `อื่นๆ (${selectedResponse.challengesOther})` : CHALLENGE_MAP[c] || c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <DetailItem label="เครื่องมือปัจจุบัน" value={selectedResponse.currentTool} />
                    <DetailItem label="วิธีจัดการปัญหาเบื้องต้น" value={selectedResponse.initialHandling} />
                  </div>
                </div>
              </section>

              <hr />

              {/* AI & Tech */}
              <section>
                <SectionHeader icon={<Sparkles className="h-5 w-5" />} title="มุมมองต่อ AI และเทคโนโลยี" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
                  <div className="space-y-6">
                    <DetailItem 
                      label="ความคาดหวัง AI (1-5)" 
                      value={
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black text-blue-600">{selectedResponse.aiExpectation}</span>
                          <div className="flex gap-1.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className={`h-2.5 w-8 rounded-full ${i < parseInt(selectedResponse.aiExpectation) ? 'bg-blue-500' : 'bg-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      } 
                    />
                    <DetailItem label="คาดการณ์การประหยัดเวลา" value={selectedResponse.aiTimeSaved} />
                  </div>
                  <div className="space-y-6">
                    <DetailItem label="ข้อกังวลต่อ AI" value={selectedResponse.aiConcerns} isLongText />
                    <DetailItem 
                      label="ช่องทางที่ถนัด" 
                      value={
                        selectedResponse.preferredChannel === 'web' ? 'เว็บไซต์' :
                        selectedResponse.preferredChannel === 'app' ? 'แอปมือถือ' : 'ระบบแชท'
                      } 
                    />
                  </div>
                </div>
              </section>

              <hr />

              {/* Marketplace */}
              <section>
                <SectionHeader icon={<Building className="h-5 w-5" />} title="การจ้างงานและบริการสนับสนุน" />
                <div className="space-y-8 mt-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-3">อุปสรรคที่ทำให้ลังเลจ้างทนายอิสระ</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResponse.hiringObstacles.map((o) => (
                        <Badge key={o} variant="outline" className="bg-red-50 text-red-700 border-red-100">
                          {o === 'cost' ? 'ค่าใช้จ่ายไม่โปร่งใส' : 
                           o === 'expertise' ? 'หาทนายยาก' :
                           o === 'process' ? 'กระบวนการยาก' : 'ความน่าเชื่อถือ'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <DetailItem 
                      label="ปัจจัยความมั่นใจสูงสุด" 
                      value={
                        selectedResponse.confidenceFactor === 'license' ? 'ประวัติและใบอนุญาต' :
                        selectedResponse.confidenceFactor === 'review' ? 'รีวิวจากผู้ใช้จริง' :
                        selectedResponse.confidenceFactor === 'price' ? 'ราคาและขอบเขตงาน' : 'ระบบ AI แนะนำ'
                      } 
                    />
                    <DetailItem label="ความสนใจจ้างงานผ่านระบบ" value={selectedResponse.outsourceInterest} />
                  </div>
                  <DetailItem label="ฟีเจอร์ Subscription ที่ต้องการ" value={selectedResponse.subscriptionInterest} isLongText />
                </div>
              </section>
            </div>
          )}
          <div className="p-8 bg-slate-50 border-t flex justify-end">
            <Button onClick={() => setIsDetailsOpen(false)} size="lg">ปิดหน้าต่าง</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-blue-600">{icon}</div>
      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{title}</h3>
    </div>
  );
}

function DetailItem({ label, value, isLongText = false }: { label: string, value: React.ReactNode, isLongText?: boolean }) {
  return (
    <div className={`space-y-2 ${isLongText ? 'col-span-full' : ''}`}>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <div className={`text-slate-900 ${isLongText ? 'bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed shadow-inner' : 'font-semibold text-lg'}`}>
        {value || '-'}
      </div>
    </div>
  );
}
