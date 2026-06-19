import { cn } from "@/lib/cn";

export type EggKind = "boiled" | "fried" | "omelette" | "none";

export interface EggIconProps extends React.SVGProps<SVGSVGElement> {
  kind: EggKind;
  /** วาดด้วย currentColor — ตั้งสีผ่าน text-* ของ parent */
}

/**
 * ไอคอนไข่วาดเอง 4 ชนิด — เอกลักษณ์ของแอป (ไม่ใช้ไอคอนสำเร็จรูป)
 * ใช้ currentColor ทั้งหมด เพื่อรับสีจาก context (เลือก/ไม่เลือก)
 * - ต้ม (boiled): ไข่ทั้งฟอง + รอยผ่าครึ่งเห็นไข่แดง
 * - ดาว (fried): ขาวไข่หยักขอบ + ไข่แดงกลม
 * - เจียว (omelette): แผ่นไข่เจียวพับ
 * - ไม่เอา (none): วงไข่ + เส้นทับ (สั่งข้าวแต่ไม่เอาไข่)
 */
export function EggIcon({ kind, className, ...props }: EggIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
      aria-hidden
      {...props}
    >
      {kind === "boiled" && (
        <>
          {/* ฟองไข่ต้ม ทรงรี */}
          <path d="M12 3.2c3.3 0 6 4 6 8.2a6 6 0 1 1-12 0c0-4.2 2.7-8.2 6-8.2Z" />
          {/* รอยผ่าครึ่ง */}
          <path d="M6.4 12.6h11.2" />
          {/* ไข่แดงตรงกลางรอยผ่า */}
          <circle cx="12" cy="12.6" r="2" fill="currentColor" stroke="none" />
        </>
      )}

      {kind === "fried" && (
        <>
          {/* ขาวไข่ขอบหยักแบบไข่ดาว */}
          <path d="M9 4.5c2.4-1 4.8.2 5.4 2.3.5 1.7 2.2 1.4 3.3 2.6 1.4 1.5.9 4-.8 5-1 .6-1 1.8-2 2.7-1.7 1.6-4.7 1.6-6.7.4-1.2-.7-1.4-2-2.6-2.7-1.9-1-2.7-3.4-1.6-5.2.7-1.2.4-2.4 1-3.4.6-.9 1.5-1.4 2-1.7Z" />
          {/* ไข่แดงกลม */}
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </>
      )}

      {kind === "omelette" && (
        <>
          {/* แผ่นไข่เจียวพับซ้อน */}
          <path d="M3.5 14.5c2-5 5-8 8.5-8s6.5 3 8.5 8c-2.2 1.6-5.2 2.6-8.5 2.6s-6.3-1-8.5-2.6Z" />
          <path d="M8 11.5c1.6 1.2 3 1.8 4 1.8s2.4-.6 4-1.8" />
          <path d="M10.5 8.4c1 .8 2 .8 3 0" />
        </>
      )}

      {kind === "none" && (
        <>
          {/* ฟองไข่ + เส้นทับ = ไม่เอาไข่ */}
          <path d="M12 3.6c3.1 0 5.7 3.8 5.7 7.8a5.7 5.7 0 1 1-11.4 0c0-4 2.6-7.8 5.7-7.8Z" />
          <path d="M6.5 18 17.5 5" />
        </>
      )}
    </svg>
  );
}
