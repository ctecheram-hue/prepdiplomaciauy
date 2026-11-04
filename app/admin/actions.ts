"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Todas las acciones verifican el rol de administración y, además, la base
// de datos las vuelve a validar con RLS.

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? null : Number(v);
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ---------- Cursos ----------
function courseFields(f: FormData) {
  const price = Number(str(f, "price").replace(",", ".")) || 0;
  return {
    title: str(f, "title"),
    slug: slugify(str(f, "slug") || str(f, "title")),
    subtitle: str(f, "subtitle") || null,
    description: str(f, "description") || null,
    cover_url: str(f, "cover_url") || null,
    price_cents: Math.round(price * 100),
    currency: str(f, "currency") || "usd",
    published: f.get("published") === "on",
    position: num(f, "position") ?? 0,
  };
}

export async function createCourse(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").insert(courseFields(f)).select("id").single();
  if (error) fail("/admin/cursos/nuevo", error.code === "23505" ? "Ya existe un curso con esa dirección (slug)." : error.message);
  redirect(`/admin/cursos/${data.id}`);
}

export async function updateCourse(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update(courseFields(f)).eq("id", id);
  if (error) fail(`/admin/cursos/${id}`, error.code === "23505" ? "Ya existe un curso con esa dirección (slug)." : error.message);
  revalidatePath("/", "layout");
  redirect(`/admin/cursos/${id}?ok=1`);
}

export async function deleteCourse(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("courses").delete().eq("id", str(f, "id"));
  revalidatePath("/", "layout");
  redirect("/admin");
}

// ---------- Módulos ----------
export async function createModule(f: FormData) {
  await requireAdmin();
  const courseId = str(f, "course_id");
  const supabase = await createClient();
  const { count } = await supabase.from("modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  await supabase.from("modules").insert({ course_id: courseId, title: str(f, "title"), position: (count ?? 0) + 1 });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function updateModule(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("modules").update({ title: str(f, "title"), position: num(f, "position") ?? 0 }).eq("id", str(f, "id"));
  revalidatePath(`/admin/cursos/${str(f, "course_id")}`);
}

export async function deleteModule(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("modules").delete().eq("id", str(f, "id"));
  revalidatePath(`/admin/cursos/${str(f, "course_id")}`);
}

// ---------- Lecciones ----------
export async function createLesson(f: FormData) {
  await requireAdmin();
  const moduleId = str(f, "module_id");
  const courseId = str(f, "course_id");
  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data, error } = await supabase
    .from("lessons")
    .insert({ module_id: moduleId, course_id: courseId, title: str(f, "title"), position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) fail(`/admin/cursos/${courseId}`, error.message);
  await supabase.from("lesson_contents").insert({ lesson_id: data.id });
  redirect(`/admin/lecciones/${data.id}`);
}

export async function updateLesson(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      title: str(f, "title"),
      module_id: str(f, "module_id"),
      position: num(f, "position") ?? 0,
      duration_min: num(f, "duration_min"),
      is_preview: f.get("is_preview") === "on",
    })
    .eq("id", id);
  if (error) fail(`/admin/lecciones/${id}`, error.message);
  await supabase
    .from("lesson_contents")
    .upsert({ lesson_id: id, video_url: str(f, "video_url") || null, body: str(f, "body") || null });
  revalidatePath("/", "layout");
  redirect(`/admin/lecciones/${id}?ok=1`);
}

export async function deleteLesson(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = str(f, "id");
  const { data: files } = await supabase.from("lesson_resources").select("storage_path").eq("lesson_id", id);
  if (files?.length) await supabase.storage.from("materiales").remove(files.map((r) => r.storage_path));
  await supabase.from("lessons").delete().eq("id", id);
  redirect(`/admin/cursos/${str(f, "course_id")}`);
}

// ---------- Materiales ----------
export async function addResource(lessonId: string, title: string, storagePath: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_resources").insert({ lesson_id: lessonId, title, storage_path: storagePath });
  if (error) return error.message;
  revalidatePath(`/admin/lecciones/${lessonId}`);
  return null;
}

export async function deleteResource(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.storage.from("materiales").remove([str(f, "storage_path")]);
  await supabase.from("lesson_resources").delete().eq("id", str(f, "id"));
  revalidatePath(`/admin/lecciones/${str(f, "lesson_id")}`);
}

// ---------- Alumnos ----------
/** Matricula una lista de correos. Si la persona aún no tiene cuenta, queda invitada. */
export async function enrollEmails(f: FormData) {
  await requireAdmin();
  const courseId = str(f, "course_id");
  const emails = Array.from(new Set(str(f, "emails").toLowerCase().split(/[\s,;]+/).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))));
  if (!courseId || !emails.length) fail("/admin/alumnos", "Indica un curso y al menos un correo válido.");

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("email", emails);
  const known = new Map((profiles ?? []).map((p) => [p.email, p.id]));
  const enroll = emails.filter((e) => known.has(e)).map((e) => ({ user_id: known.get(e)!, course_id: courseId, source: "manual" }));
  const invite = emails.filter((e) => !known.has(e)).map((email) => ({ email, course_id: courseId }));

  if (enroll.length) await supabase.from("enrollments").upsert(enroll, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  if (invite.length) await supabase.from("enrollment_invites").upsert(invite, { onConflict: "email,course_id", ignoreDuplicates: true });
  redirect(`/admin/alumnos?ok=${encodeURIComponent(`${enroll.length} matriculados, ${invite.length} invitados (se activan al crear su cuenta).`)}`);
}

export async function removeEnrollment(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("enrollments").delete().eq("id", str(f, "id"));
  revalidatePath("/admin/alumnos");
}

export async function removeInvite(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("enrollment_invites").delete().eq("id", str(f, "id"));
  revalidatePath("/admin/alumnos");
}
