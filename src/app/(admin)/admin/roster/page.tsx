import { UserPlus, Users, LinkIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerClient } from "@/lib/supabase/server";
import type { UserRow, UserRole } from "@/lib/db/types";
import { Button, Card, EmptyState } from "@/components/ui";
import {
  addRosterMemberAction,
  toggleActiveAction,
  setRoleAction,
} from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<UserRole, string> = {
  member: "สมาชิก",
  cook: "แม่ครัว",
  admin: "แอดมิน",
};
const ROLES: UserRole[] = ["member", "cook", "admin"];

export default async function RosterPage() {
  await requireAdmin();
  const sb = await createServerClient();

  const { data } = await sb
    .from("users")
    .select("*")
    .order("is_active", { ascending: false })
    .order("display_name", { ascending: true });
  const users = (data ?? []) as UserRow[];

  const unclaimed = users.filter((u) => u.line_user_id === null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">รายชื่อสมาชิก (Roster)</h1>
        <p className="text-sm text-muted">
          เพิ่มชื่อล่วงหน้าได้ — บัญชี LINE จะผูกตอนสมาชิกเข้าแอปครั้งแรก
        </p>
      </div>

      {/* เพิ่มสมาชิก roster (ชื่ออย่างเดียว, ยังไม่มีบัญชี LINE) */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">เพิ่มสมาชิกใหม่</h2>
        <form action={addRosterMemberAction} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="displayName"
            type="text"
            required
            maxLength={80}
            placeholder="ชื่อที่จะแสดงในตาราง เช่น พี่แอน"
            aria-label="ชื่อสมาชิก"
            className="min-h-[44px] flex-1 rounded-xl border border-border bg-card px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
          <Button type="submit" leadingIcon={<UserPlus className="size-4" aria-hidden />}>
            เพิ่ม
          </Button>
        </form>
      </Card>

      {/* แถวที่ยังไม่ผูกบัญชี LINE — TODO: ผูกกับ login ในอนาคต */}
      {unclaimed.length > 0 && (
        <Card className="border-yolk/40 bg-yolk/[0.06] p-4">
          <div className="flex items-start gap-2">
            <LinkIcon className="mt-0.5 size-4 shrink-0 text-yolk-ink" aria-hidden />
            <div className="text-sm">
              <p className="font-bold text-yolk-ink">
                ยังไม่ผูกบัญชี LINE ({unclaimed.length} คน)
              </p>
              <p className="mt-0.5 text-yolk-ink/80">
                {unclaimed.map((u) => u.display_name).join(", ")}
              </p>
              <p className="mt-1 text-xs text-muted">
                จะผูกอัตโนมัติเมื่อสมาชิกเข้าแอปครั้งแรก (claim-on-login).
                การจับคู่ด้วยมือยังไม่รองรับในเวอร์ชันนี้ (TODO)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* รายชื่อทั้งหมด */}
      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" aria-hidden />}
          title="ยังไม่มีสมาชิก"
          description="เพิ่มชื่อสมาชิกด้านบนเพื่อให้ตารางสรุปแสดงครบทุกคน"
        />
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <Card className={`p-3 ${u.is_active ? "" : "opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{u.display_name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span>{ROLE_LABEL[u.role]}</span>
                      {u.line_user_id === null ? (
                        <span className="rounded-full border border-yolk/40 bg-yolk/15 px-1.5 py-px text-yolk-ink">
                          ยังไม่ผูก LINE
                        </span>
                      ) : (
                        <span className="rounded-full border border-leaf/35 bg-leaf/12 px-1.5 py-px text-leaf">
                          ผูกแล้ว
                        </span>
                      )}
                      {!u.is_active && (
                        <span className="rounded-full border border-border bg-muted/12 px-1.5 py-px text-muted">
                          ปิดใช้งาน
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {/* เปลี่ยนบทบาท */}
                  <form action={setRoleAction} className="flex items-end gap-1.5">
                    <input type="hidden" name="userId" value={u.id} />
                    <label className="sr-only" htmlFor={`role-${u.id}`}>
                      บทบาทของ {u.display_name}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      name="role"
                      defaultValue={u.role}
                      className="min-h-[44px] rounded-lg border border-border bg-card px-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="secondary">
                      ตั้งบทบาท
                    </Button>
                  </form>

                  {/* toggle is_active */}
                  <form action={toggleActiveAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="isActive" value={u.is_active ? "" : "true"} />
                    <Button type="submit" size="sm" variant={u.is_active ? "ghost" : "primary"}>
                      {u.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
