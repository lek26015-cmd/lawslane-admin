'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-guard';
import {
    getSourceRows,
    importSource,
    listSources,
    processSourceImage,
    syncCouncilSources,
    updateSourceRow,
    type CouncilSource,
    type SourceImage,
    type SourceRow,
} from '@/lib/council-pipeline';
import type { ImportResult } from '@/lib/registry-core';

export type { CouncilSource, SourceImage, SourceRow };

// หน้าหลังบ้าน /lawyer-registry/council — ทุก action ตรวจสิทธิ์แอดมินก่อน
async function db() {
    await requireAdmin('users.registry');
    const admin = await initAdmin();
    if (!admin) throw new Error('Server error: Admin SDK not initialized');
    return admin.firestore();
}

export async function syncCouncilAnnouncementsAction(): Promise<{ added: number; total: number }> {
    return syncCouncilSources(await db());
}

export async function listCouncilSourcesAction(): Promise<CouncilSource[]> {
    return JSON.parse(JSON.stringify(await listSources(await db())));
}

export async function processCouncilImageAction(postId: string, index: number): Promise<SourceImage> {
    return processSourceImage(await db(), String(postId), Number(index));
}

export async function getCouncilRowsAction(postId: string): Promise<SourceRow[]> {
    return getSourceRows(await db(), String(postId));
}

export async function updateCouncilRowAction(postId: string, rowId: string, patch: Partial<SourceRow>): Promise<void> {
    return updateSourceRow(await db(), String(postId), String(rowId), patch);
}

export async function importCouncilSourceAction(postId: string): Promise<ImportResult> {
    return importSource(await db(), String(postId));
}
