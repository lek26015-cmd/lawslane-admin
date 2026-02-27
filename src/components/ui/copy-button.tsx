'use client';

import { useState } from 'react';
import { Button } from './button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CopyButtonProps {
    value: string;
    className?: string;
    variant?: "ghost" | "outline" | "link" | "default" | "destructive" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
}

export function CopyButton({ value, className, variant = "ghost", size = "icon" }: CopyButtonProps) {
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setIsCopied(true);
            toast({
                title: "คัดลอกแล้ว",
                description: "คัดลอกหมายเลขไปยังคลิปบอร์ดแล้ว",
            });
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={`h-6 w-6 p-0 ${className}`}
            onClick={handleCopy}
            title="Copy to clipboard"
        >
            {isCopied ? (
                <Check className="h-3 w-3 text-green-500" />
            ) : (
                <Copy className="h-3 w-3" />
            )}
            <span className="sr-only">Copy</span>
        </Button>
    );
}
