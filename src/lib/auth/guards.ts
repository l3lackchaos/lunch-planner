import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppUser } from "@/lib/types";

/** Require any authenticated Member; otherwise bounce to the splash/login. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** Require an admin; members are sent home, unauthenticated to splash. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/");
  return user;
}

/** Cook or admin (for read-only summary access). */
export async function requireCookOrAdmin(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "admin" && user.role !== "cook") redirect("/");
  return user;
}
