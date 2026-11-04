"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateName(formData: FormData) {
  const session = await requireUser();
  const supabase = await createClient();
  await supabase.from("profiles").update({ full_name: String(formData.get("full_name")).trim() }).eq("id", session.userId);
  revalidatePath("/mi-cuenta");
}
