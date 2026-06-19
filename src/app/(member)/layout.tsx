/**
 * Member shell. Auth is handled by LiffProvider (client overlay) in the root
 * layout — we don't hard-redirect here so the home route ("/") can complete the
 * LIFF handshake without a loop. Individual non-home pages may call requireUser().
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>;
}
