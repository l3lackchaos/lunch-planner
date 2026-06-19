export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🍱</div>
      <h1 className="text-2xl font-bold text-ink">Lunch Planner</h1>
      <p className="text-muted">
        สั่งข้าวกลางวัน เลือกไข่ และแจ้งชำระเงิน ผ่าน LINE
      </p>
      <p className="rounded-card border border-border bg-card px-4 py-2 text-sm text-muted">
        กำลังพัฒนา — Phase 0 (foundation)
      </p>
    </main>
  );
}
