"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { publicEnv } from "@/lib/env";
import type { AppUser, UserRole } from "@/lib/types";

/**
 * Real LIFF bootstrap (ADR-0002).
 *
 * On mount (client only): liff.init → liff.login if needed → getIDToken →
 * POST /api/auth/line → store the returned Member in context. Exposes
 * useSession() = { user, role, loading, error }.
 *
 * Keeps the default-export signature consumed by src/app/layout.tsx.
 */

interface SessionState {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

const SessionContext = createContext<SessionState>({
  user: null,
  role: null,
  loading: true,
  error: null,
});

export function useSession(): SessionState {
  return useContext(SessionContext);
}

export default function LiffProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: LIFF SDK is browser-only.
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function bootstrap() {
      try {
        const { default: liff } = await import("@line/liff");

        await liff.init({ liffId: publicEnv.liffId() });

        if (!liff.isLoggedIn()) {
          // Redirects out of the app; nothing runs after this on this load.
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          throw new Error("ไม่พบ ID token จาก LINE");
        }

        const res = await fetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
          throw new Error("เข้าสู่ระบบไม่สำเร็จ");
        }

        const data = (await res.json()) as { user: AppUser };
        if (!cancelled) {
          setUser(data.user);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper text-muted">
        <p className="text-sm">กำลังเข้าสู่ระบบ…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-paper px-6 text-center">
        <p className="text-sm text-chili">{error}</p>
        <p className="text-xs text-muted">กรุณาเปิดแอปอีกครั้งผ่าน LINE</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider
      value={{ user, role: user?.role ?? null, loading, error }}
    >
      {children}
    </SessionContext.Provider>
  );
}
