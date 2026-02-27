
'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquarePlus } from 'lucide-react';

interface QuickReply {
    id: string;
    label: string;
    text: string;
}

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
    {
        id: 'request_info',
        label: 'ขอข้อมูลผู้ติดต่อ',
        text: 'รบกวนขอข้อมูลต่อไปนี้: ชื่อ-นามสกุล, ที่อยู่, เบอร์โทรศัพท์ เพื่อประกอบการทำเอกสารครับ/ค่ะ',
    },
    {
        id: 'on_process',
        label: 'แจ้งการทำงาน',
        text: 'กำลังดำเนินการตรวจสอบเอกสาร และจะแจ้งความคืบหน้าให้ทราบโดยเร็วที่สุดครับ/ค่ะ',
    },
    {
        id: 'document_ready',
        label: 'เอกสารพร้อมแล้ว',
        text: 'เอกสารดำเนินการเสร็จเรียบร้อยแล้วครับ/ค่ะ สามารถตรวจสอบได้ในรายการเอกสารของท่าน',
    },
];

interface QuickRepliesProps {
    onSelect: (text: string) => void;
}

export function QuickReplies({ onSelect }: QuickRepliesProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs h-8">
                    <MessageSquarePlus className="w-4 h-4" />
                    <span>ข้อความด่วน</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                {DEFAULT_QUICK_REPLIES.map((reply) => (
                    <DropdownMenuItem
                        key={reply.id}
                        onClick={() => onSelect(reply.text)}
                        className="cursor-pointer"
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-xs">{reply.label}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">{reply.text}</span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
