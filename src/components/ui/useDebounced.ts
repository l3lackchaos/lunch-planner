"use client";

import { useEffect, useState } from "react";

/**
 * คืนค่า `value` แบบหน่วงเวลา — อัปเดตหลังหยุดเปลี่ยนค่า `delay` มิลลิวินาที
 * ใช้กับช่อง Search เพื่อลดการ query ถี่ ๆ (default 250ms ตาม docs)
 */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
