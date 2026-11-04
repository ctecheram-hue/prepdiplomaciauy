"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function toggleComplete(formData: FormData) {
  const session = await requireUser();
  const lessonId = String(formData.get("lessonId"));
  const done = formData.get("done") === "1";
  const supabase = await createClient();
  if (done) {
    await supabase.from("lesson_progress").delete().eq("user_id", session.userId).eq("lesson_id", lessonId);
  } else {
    await supabase.from("lesson_progress").upsert({ user_id: session.userId, lesson_id: lessonId });
  }
  revalidatePath("/aula", "layout");
}

/** Inscripción directa a cursos gratuitos. */
export async function enrollFree(formData: FormData) {
  const slug = String(formData.get("slug"));
  const session = await requireUser(`/cursos/${slug}`);
  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, price_cents, published")
    .eq("slug", slug)
    .maybeSingle();
  if (!course || !course.published || course.price_cents !== 0) redirect(`/cursos/${slug}`);
  await admin
    .from("enrollments")
    .upsert({ user_id: session.userId, course_id: course.id, source: "free" }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  redirect(`/aula/${slug}`);
}
