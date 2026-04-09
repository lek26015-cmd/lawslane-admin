'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { Loader2, FileWarning } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SecureImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackClassName?: string;
    loadingClassName?: string;
    showLoader?: boolean;
}

/**
 * A component that handles both public URLs and private Firebase Storage paths.
 * If the src is a Firebase path (does not start with http), it fetches a temporary download URL.
 */
export function SecureImage({ 
    src, 
    alt, 
    className, 
    fallbackClassName, 
    loadingClassName,
    showLoader = true 
}: SecureImageProps) {
    const { storage } = useFirebase();
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        if (!src) {
            setIsLoading(false);
            return;
        }

        // If it's already a full URL (likely legacy R2 public URL), use it directly
        if (src.startsWith('http')) {
            setResolvedUrl(src);
            setIsLoading(false);
            return;
        }

        // Otherwise, resolve the Firebase path
        if (!storage) {
            console.error("Firebase Storage not initialized");
            setError(true);
            setIsLoading(false);
            return;
        }

        const resolvePath = async () => {
            try {
                setIsLoading(true);
                setError(false);
                const storageRef = ref(storage, src);
                const url = await getDownloadURL(storageRef);
                setResolvedUrl(url);
            } catch (err) {
                console.error("Error resolving secure image path:", src, err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        resolvePath();
    }, [src, storage]);

    if (!src) {
        return (
            <div className={cn("flex flex-col items-center justify-center bg-slate-100 rounded-md p-4", fallbackClassName)}>
                <FileWarning className="h-8 w-8 text-slate-400 mb-1" />
                <span className="text-xs text-slate-500">No Image</span>
            </div>
        );
    }

    if (isLoading && showLoader) {
        return (
            <div className={cn("flex items-center justify-center bg-slate-50 rounded-md", loadingClassName, className)}>
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("flex flex-col items-center justify-center bg-red-50 border border-red-100 rounded-md p-4", fallbackClassName)}>
                <FileWarning className="h-8 w-8 text-red-200 mb-1" />
                <span className="text-xs text-red-400">Error Loading</span>
            </div>
        );
    }

    if (!resolvedUrl) return null;

    return (
        <img
            src={resolvedUrl}
            alt={alt}
            className={cn("object-cover", className)}
            onError={() => setError(true)}
        />
    );
}
