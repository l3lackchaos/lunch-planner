import LiffProvider from "@/components/providers/LiffProvider";

/**
 * Member shell. LiffProvider handles the LINE login handshake here (the client
 * overlay) so the member entry "/" can complete it without a loop. /preview and
 * /api are intentionally outside this provider so the UI kit is viewable without
 * LINE. Admin pages rely on the session cookie set during this handshake.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiffProvider>
      <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
    </LiffProvider>
  );
}
