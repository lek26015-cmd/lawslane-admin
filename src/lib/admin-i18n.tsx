'use client';

import React from 'react';

/**
 * ภาษาของหลังบ้าน — ไทยเป็นค่าเริ่มต้น สลับเป็นอังกฤษได้ (จำไว้ใน localStorage ต่อเบราว์เซอร์)
 *
 * ใช้แบบคู่ข้อความในที่เดียว: const { tx } = useAdminLocale(); tx('บันทึก', 'Save')
 * ไม่ต้องมีไฟล์ dictionary แยก — แก้ข้อความทั้งสองภาษาได้ในไฟล์หน้าเดียวกัน
 * (แยกจาก next-intl ที่ใช้เฉพาะหน้า (lawyer) ซึ่งยก component มาจากเว็บหลัก)
 */
export type AdminLocale = 'th' | 'en';

const STORAGE_KEY = 'admin-locale';

type Ctx = {
    locale: AdminLocale;
    setLocale: (l: AdminLocale) => void;
    tx: (th: string, en: string) => string;
};

const AdminLocaleContext = React.createContext<Ctx>({
    locale: 'th',
    setLocale: () => {},
    tx: th => th,
});

export function AdminLocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = React.useState<AdminLocale>('th');

    React.useEffect(() => {
        try {
            if (localStorage.getItem(STORAGE_KEY) === 'en') setLocaleState('en');
        } catch { /* ปิด storage อยู่ = ใช้ไทย */ }
    }, []);

    React.useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLocale = React.useCallback((l: AdminLocale) => {
        setLocaleState(l);
        try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    }, []);

    const value = React.useMemo<Ctx>(() => ({
        locale,
        setLocale,
        tx: (th, en) => (locale === 'en' ? en : th),
    }), [locale, setLocale]);

    return <AdminLocaleContext.Provider value={value}>{children}</AdminLocaleContext.Provider>;
}

export function useAdminLocale() {
    return React.useContext(AdminLocaleContext);
}

/** ปุ่มสลับ TH / EN */
export function AdminLocaleToggle({ className }: { className?: string }) {
    const { locale, setLocale } = useAdminLocale();
    return (
        <div role="radiogroup" aria-label="Language" className={`inline-flex rounded-full border bg-white p-0.5 text-xs font-semibold ${className || ''}`}>
            {(['th', 'en'] as const).map(l => (
                <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={locale === l}
                    onClick={() => setLocale(l)}
                    className={`px-2.5 py-1 rounded-full transition-colors ${locale === l ? 'bg-[#0B3979] text-white' : 'text-slate-500 hover:text-[#0B3979]'}`}
                >
                    {l.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
