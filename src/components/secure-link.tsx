'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SecureLinkProps {
    src?: string;
    label?: string;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

/**
 * A component that handles both public URLs and private Firebase Storage paths for links.
 * It resolves the URL if it's a Firebase path before opening.
 */
export function SecureLink({ 
    src, 
    label = 'เปิดดูเอกสาร', 
    className,
    variant = "outline",
    size = "sm"
}: SecureLinkProps) {
    const { storage } = useFirebase();
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<boolean>(false);

    const resolveAndOpen = async (e: React.MouseEvent) => {
        if (!src) return;
        
        // If it's already a full URL, let the default behavior happen (or handle it if needed)
        if (src.startsWith('http')) {
            return;
        }

        e.preventDefault();

        if (!storage) {
            console.error("Firebase Storage not initialized");
            return;
        }

        try {
            setIsLoading(true);
            const storageRef = ref(storage, src);
            const url = await getDownloadURL(storageRef);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            console.error("Error resolving secure link:", src, err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (!src) return null;

    const isHttp = src.startsWith('http');

    return (
        <Button 
            variant={variant} 
            size={size} 
            className={cn("rounded-full", className)}
            onClick={resolveAndOpen}
            disabled={isLoading}
            asChild={isHttp}
        >
            {isHttp ? (
                <a href={src} target="_blank" rel="noopener noreferrer">
                    {label}
                    <ExternalLink className="ml-2 h-3 w-3" />
                </a>
            ) : (
                <>
                    {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ExternalLink className="mr-2 h-3 w-3" />}
                    {error ? 'Error' : label}
                </>
            )}
        </Button>
    );
}
