
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { thaiProvinces } from '@/data/thai-provinces';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Scale } from 'lucide-react';

export default function LawyerFilterSidebar() {
  const specialties = ['คดีฉ้อโกง SMEs', 'คดีแพ่งและพาณิชย์', 'การผิดสัญญา'];

  return (
    <Card className="rounded-3xl shadow-lg border-2 border-slate-100 overflow-hidden">
      <CardHeader className="bg-slate-50/50 pb-4">
        <CardTitle className="text-xl text-primary">ตัวกรองการค้นหา</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-3">
          <Label htmlFor="specialty" className="text-sm font-medium text-slate-600">ความเชี่ยวชาญ</Label>
          <Select>
            <SelectTrigger id="specialty" className="rounded-full border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors h-11">
              <SelectValue placeholder="ทั้งหมด" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="rounded-lg">ทั้งหมด</SelectItem>
              {specialties.map((spec) => (
                <SelectItem key={spec} value={spec} className="rounded-lg">
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-600">คะแนนรีวิวขั้นต่ำ</Label>
          <RadioGroup defaultValue="all" className="space-y-2.5">
            {[4, 3, 2].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <RadioGroupItem value={String(rating)} id={`rating-${rating}`} />
                <Label htmlFor={`rating-${rating}`} className="flex items-center gap-1 font-normal text-slate-600 cursor-pointer">
                  {[...Array(5)].map((_, i) => (
                    <Scale key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">ขึ้นไป</span>
                </Label>
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="rating-all" />
              <Label htmlFor="rating-all" className="font-normal text-slate-600 cursor-pointer">ทั้งหมด</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-3">
          <Label htmlFor="province" className="text-sm font-medium text-slate-600">จังหวัด/พื้นที่</Label>
          <Select>
            <SelectTrigger id="province" className="rounded-full border-slate-200 bg-white shadow-sm hover:border-primary/50 transition-colors h-11">
              <SelectValue placeholder="ทุกจังหวัด" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="rounded-lg">ทุกจังหวัด</SelectItem>
              {thaiProvinces.map((region) => (
                <SelectGroup key={region.region}>
                  <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{region.region}</SelectLabel>
                  {region.provinces.map((prov) => (
                    <SelectItem key={prov} value={prov} className="rounded-lg">
                      {prov}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="pb-6 pt-2">
        <Button className="w-full rounded-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all">ค้นหาด้วยตัวกรอง</Button>
      </CardFooter>
    </Card>
  );
}

