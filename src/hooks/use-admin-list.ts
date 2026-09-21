'use client';

import * as React from 'react';
import {
  getDocs,
  type Query,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';

/**
 * Cursor เดียวใช้ได้ทั้ง 2 แหล่งข้อมูล:
 *  - firestore-client: QueryDocumentSnapshot ตัวสุดท้ายของหน้าก่อนหน้า (ใช้กับ startAfter)
 *  - server-action: string ที่ server action นิยามเอง (เช่น createdAt+id ต่อกัน) เพราะ
 *    ส่ง QueryDocumentSnapshot ข้าม client/server boundary ไม่ได้
 */
export type AdminListCursor = QueryDocumentSnapshot<DocumentData> | string | null;

export type AdminListSource<T> =
  | {
      kind: 'firestore-client';
      /** คืน query null ได้เมื่อยังไม่พร้อม (เช่น firestore instance ยังไม่มา) — hook จะแสดงรายการว่างเฉยๆ */
      buildQuery: (cursor: AdminListCursor, pageSize: number) => Query<DocumentData> | null;
      mapDoc: (doc: QueryDocumentSnapshot<DocumentData>) => T;
    }
  | {
      kind: 'server-action';
      fetchPage: (cursor: AdminListCursor, pageSize: number) => Promise<{ items: T[]; nextCursor: AdminListCursor }>;
    };

interface UseAdminListOptions<T> {
  source: AdminListSource<T>;
  pageSize?: number;
  /**
   * รวมทุกค่าที่มีผลต่อ buildQuery/fetchPage เป็น string เดียว (เช่น
   * `${activeTab}|${debouncedSearch}|${JSON.stringify(filters)}`) — hook จะรีเซ็ตกลับหน้า 1
   * ให้เองทุกครั้งที่ค่านี้เปลี่ยน ผู้เรียกต้องใส่ให้ครบ ไม่งั้นกด "ถัดไป/ก่อนหน้า" หลังเปลี่ยน
   * filter อาจใช้ cursor ที่ค้างจาก filter ชุดเก่า
   */
  resetKey: string;
}

interface UseAdminListResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasNext: boolean;
  hasPrevious: boolean;
  /** เลข 1-indexed สำหรับโชว์ผู้ใช้เท่านั้น ไม่ใช่ query offset จริง (Firestore ไม่รองรับ offset ถูกๆ) */
  page: number;
  next: () => void;
  previous: () => void;
  /** เรียกซ้ำหน้าปัจจุบัน (ไม่รีเซ็ตกลับหน้า 1) — ใช้หลังแก้ไข/อัปเดตแถวในหน้านี้ */
  refresh: () => void;
}

export function useAdminList<T>({ source, pageSize = 25, resetKey }: UseAdminListOptions<T>): UseAdminListResult<T> {
  const [data, setData] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [hasNext, setHasNext] = React.useState(false);
  const [pageIndex, setPageIndex] = React.useState(0);

  // cursorStack[i] = cursor ที่ต้องใช้เรียกหน้า i (index 0 คือหน้าแรกเสมอ = null)
  // ใช้ ref เพราะเป็น "ความจำของ query" ไม่ใช่ state ที่ต้อง trigger re-render เอง
  const cursorStackRef = React.useRef<AdminListCursor[]>([null]);
  const sourceRef = React.useRef(source);
  sourceRef.current = source;

  const fetchPage = React.useCallback(
    async (index: number) => {
      setLoading(true);
      setError(null);
      try {
        const cursor = cursorStackRef.current[index] ?? null;
        const currentSource = sourceRef.current;
        let items: T[];
        let nextCursor: AdminListCursor;

        if (currentSource.kind === 'firestore-client') {
          const q = currentSource.buildQuery(cursor, pageSize);
          if (!q) {
            items = [];
            nextCursor = null;
          } else {
            const snap = await getDocs(q);
            items = snap.docs.map(currentSource.mapDoc);
            // เต็มหน้า (== pageSize) ถึงจะสันนิษฐานว่ามีหน้าถัดไป — ถ้าได้น้อยกว่านั้นคือหมดแล้ว
            nextCursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
          }
        } else {
          const result = await currentSource.fetchPage(cursor, pageSize);
          items = result.items;
          nextCursor = result.nextCursor;
        }

        cursorStackRef.current[index + 1] = nextCursor;
        setData(items);
        setHasNext(!!nextCursor);
        setPageIndex(index);
      } catch (err) {
        console.error('useAdminList fetchPage failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setData([]);
        setHasNext(false);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  React.useEffect(() => {
    cursorStackRef.current = [null];
    fetchPage(0);
    // resetKey คือสัญญาณ "เริ่มใหม่จากหน้า 1" แต่เดียว — ไม่ใส่ fetchPage/source ใน deps
    // เพราะ 2 ตัวนั้นเปลี่ยน identity ทุก render อยู่แล้ว (จะวน fetch ไม่รู้จบ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return {
    data,
    loading,
    error,
    hasNext,
    hasPrevious: pageIndex > 0,
    page: pageIndex + 1,
    next: () => {
      if (hasNext && !loading) fetchPage(pageIndex + 1);
    },
    previous: () => {
      if (pageIndex > 0 && !loading) fetchPage(pageIndex - 1);
    },
    refresh: () => {
      if (!loading) fetchPage(pageIndex);
    },
  };
}
