import Link from "next/link";
import { requireCookOrAdmin } from "@/lib/auth/guards";

const ADMIN_NAV = [
  { href: "/admin", label: "หน้าหลัก" },
  { href: "/admin/menus", label: "เมนู (เดือน)" },
  { href: "/admin/voting", label: "โหวตเมนู" },
  { href: "/admin/roster", label: "รายชื่อ" },
];

/**
 * Admin-area shell. Allows cook OR admin in (cooks reach the read-only summary);
 * each admin-only page enforces requireAdmin() itself. Nav is reduced for cooks.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCookOrAdmin();
  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl">
      <header className="sticky top-0 z-10 border-b border-border bg-paper/90 backdrop-blur">
        <nav className="flex items-center gap-1 overflow-x-auto px-3 py-2 text-sm">
          <span className="mr-1 font-bold text-ink">{isAdmin ? "แอดมิน" : "แม่ครัว"}</span>
          {isAdmin &&
            ADMIN_NAV.map((n) => (
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
