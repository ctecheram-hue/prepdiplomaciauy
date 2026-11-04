import { redirect } from "next/navigation";
import { isDemo } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getSession(): Promise<{ userId: string; profile: Profile | null } | null> {
  if (isDemo) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();
  return { userId: data.user.id, profile: (profile as Profile) ?? null };
}

export async function requireUser(next = "/mi-cuenta") {
  const session = await getSession();
  if (!session) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return session;
}

export async function requireAdmin() {
  const session = await requireUser("/admin");
  if (session.profile?.role !== "admin") redirect("/mi-cuenta");
  return session;
}
