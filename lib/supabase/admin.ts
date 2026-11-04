import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/config";

/** Cliente con clave de servicio: omite RLS. Usar solo en el servidor (webhook de Stripe). */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
}
