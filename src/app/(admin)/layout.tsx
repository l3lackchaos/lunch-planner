import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";

const NAV = [
  { href: "/admin", label: "หน้าหลัก" },
  { href: "/admin/menus", label: "เมนู (เดือน)" },
  { href: "/admin/roster", label: "รายชื่อ" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl">
      <header className="sticky top-0 z-10 border-b border-border bg-paper/90 backdrop-blur">
        <nav className="flex items-center gap-1 overflow-x-auto px-3 py-2 text-sm">
          <span className="mr-1 font-bold text-ink">แอดมิน</span>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted hover:bg-card hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="px-3 py-4">{children}</main>
    </div>
  );
}
