import { useEffect, useState } from 'react';

/** หน่วงค่าที่เปลี่ยนบ่อย (เช่นช่องค้นหา) ไว้ก่อนเอาไปยิง query จริง */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
