
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
  Users
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
import { SmeSurveyResponse } from '@/types/sme-survey';

const BUSINESS_TYPE_MAP: Record<string, string> = {
  service: 'ภาคบริการ',
  manufacturing: 'การผลิต',
  retail: 'ค้าปลีก-ค้าส่ง',
  tech: 'เทคโนโลยีและดิจิทัล',
  other: 'อื่นๆ'
};

const LEGAL_PROBLEM_MAP: Record<string, string> = {
  contract: 'สัญญาธุรกิจ',
  labor: 'แรงงานและลูกจ้าง',
  ip: 'ทรัพย์สินทางปัญญา',
  debt: 'หนี้สิน',
  other: 'อื่นๆ'
};

const OBSTACLE_MAP: Record<string, string> = {
  cost: 'ค่าใช้จ่าย',
  expertise: 'หาทนายยาก',
  process: 'กระบวนการยาก',
  trust: 'ความน่าเชื่อถือ',
  other: 'อื่นๆ'
};

export default function SmeSurveysPage() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedResponse, setSelectedResponse] = React.useState<SmeSurveyResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  // Firestore query
  const surveyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sme_survey_responses'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: surveys, isLoading } = useCollection<SmeSurveyResponse>(surveyQuery);

  // Filtered surveys
  const filteredSurveys = React.useMemo(() => {
    if (!surveys) return [];
    return surveys.filter(s => 
      s.respondentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.businessType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [surveys, searchTerm]);

  const handleViewDetails = (response: SmeSurveyResponse) => {
    setSelectedResponse(response);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SME Survey Responses</h1>
          <p className="text-muted-foreground">
            การศึกษาปัญหาทางกฎหมายและความคาดหวังของกลุ่ม SMEs
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
                placeholder="ค้นหาตามชื่อ หรือประเภทธุรกิจ..."
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
                  <TableHead>ผู้ให้สัมภาษณ์</TableHead>
                  <TableHead>ประเภทธุรกิจ</TableHead>
                  <TableHead>ขนาด</TableHead>
                  <TableHead>ระยะเวลา</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredSurveys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ClipboardList className="h-12 w-12 text-slate-200" />
                        <p className="text-slate-500 font-medium">ไม่พบข้อมูลแบบสำรวจ</p>
                        <p className="text-slate-400 text-sm">ยังไม่มีการส่งแบบสำรวจในระบบ</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSurveys.map((survey) => (
                    <TableRow key={survey.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium">
                        {survey.createdAt ? format(survey.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: th }) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{survey.respondentName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal bg-indigo-50 text-indigo-700 border-indigo-100">
                          {BUSINESS_TYPE_MAP[survey.businessType] || survey.businessType}
                        </Badge>
                      </TableCell>
                      <TableCell>{survey.businessSize}</TableCell>
                      <TableCell>{survey.businessDuration}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-lg">
                <Building className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">SME Survey Submission</DialogTitle>
                <DialogDescription className="text-slate-400">
                  ส่งเมื่อ {selectedResponse?.createdAt ? format(selectedResponse.createdAt.toDate(), 'dd MMMM yyyy HH:mm', { locale: th }) : '-'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedResponse && (
            <div className="p-6 space-y-8">
              {/* Section 1: SME Profile */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  ข้อมูลพื้นฐานธุรกิจ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem label="ชื่อ-ตำแหน่ง" value={selectedResponse.respondentName} />
                  <DetailItem 
                    label="ประเภทธุรกิจ" 
                    value={
                      selectedResponse.businessType === 'other' 
                        ? `อื่นๆ (${selectedResponse.businessTypeOther})` 
                        : BUSINESS_TYPE_MAP[selectedResponse.businessType] || selectedResponse.businessType
                    } 
                  />
                  <DetailItem label="ขนาดธุรกิจ" value={selectedResponse.businessSize} />
                  <DetailItem label="ระยะเวลาดำเนินธุรกิจ" value={selectedResponse.businessDuration} />
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Section 2: Pain Points */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  ปัญหาและอุปสรรคทางกฎหมาย
                </h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">ปัญหาที่พบบ่อย</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResponse.legalProblems.map((p) => (
                        <Badge key={p} variant="outline" className="bg-slate-50">
                          {p === 'other' ? `อื่นๆ (${selectedResponse.legalProblemsOther})` : LEGAL_PROBLEM_MAP[p] || p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DetailItem label="วิธีจัดการเบื้องต้น" value={selectedResponse.initialHandling} isLongText />
                  <div>
                    <p className="text-sm text-slate-500 mb-2">อุปสรรคในการจ้างทนาย</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResponse.hiringObstacles.map((o) => (
                        <Badge key={o} variant="outline" className="bg-red-50 text-red-700 border-red-100">
                          {o === 'other' ? `อื่นๆ (${selectedResponse.hiringObstaclesOther})` : OBSTACLE_MAP[o] || o}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Section 3: Tech Acceptance */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  การยอมรับเทคโนโลยี
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem 
                    label="คะแนนความต้องการ AI (1-5)" 
                    value={
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-indigo-600">{selectedResponse.aiHelpfulness}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-2 w-6 rounded-full ${i < parseInt(selectedResponse.aiHelpfulness) ? 'bg-indigo-500' : 'bg-slate-200'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    } 
                  />
                  <DetailItem 
                    label="ช่องทางที่ถนัด" 
                    value={
                      selectedResponse.preferredChannel === 'web' ? 'เว็บไซต์' :
                      selectedResponse.preferredChannel === 'app' ? 'แอปมือถือ' : 'ระบบแชท'
                    } 
                  />
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Section 4: UX & Subscription */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  UX และสิ่งที่ต้องการ
                </h3>
                <div className="space-y-6">
                  <DetailItem 
                    label="ปัจจัยที่ทำให้มั่นใจที่สุด" 
                    value={
                      selectedResponse.confidenceFactor === 'license' ? 'ประวัติและใบอนุญาต' :
                      selectedResponse.confidenceFactor === 'review' ? 'รีวิวและคะแนน' :
                      selectedResponse.confidenceFactor === 'ai_suggest' ? 'AI แนะนำทนาย' : 'ตารางราคาที่ชัดเจน'
                    } 
                  />
                  <DetailItem label="ฟีเจอร์ Subscription ที่ต้องการ" value={selectedResponse.subscriptionInterest} isLongText />
                </div>
              </section>
            </div>
          )}
          <div className="p-6 bg-slate-50 border-t flex justify-end">
            <Button onClick={() => setIsDetailsOpen(false)}>ปิดหน้าต่าง</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value, isLongText = false }: { label: string, value: React.ReactNode, isLongText?: boolean }) {
  return (
    <div className={`space-y-1 ${isLongText ? 'col-span-full' : ''}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <div className={`text-slate-900 ${isLongText ? 'bg-slate-50 p-4 rounded-lg border border-slate-100' : 'font-medium'}`}>
        {value || '-'}
      </div>
    </div>
  );
}
