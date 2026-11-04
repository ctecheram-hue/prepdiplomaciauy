import { isDemo } from "@/lib/config";
import { demoContents, demoCourses } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseWithSyllabus, Lesson, LessonContent, LessonResource, Module } from "@/lib/types";

const COURSE_FIELDS = "id, slug, title, subtitle, description, cover_url, price_cents, currency, published, position";

export async function listPublishedCourses(): Promise<Course[]> {
  if (isDemo) return demoCourses;
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(COURSE_FIELDS).eq("published", true).order("position");
  return (data as Course[]) ?? [];
}

function sortSyllabus(course: CourseWithSyllabus): CourseWithSyllabus {
  const modules = [...course.modules]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ ...m, lessons: [...m.lessons].sort((a, b) => a.position - b.position) }));
  return { ...course, modules };
}

async function fetchCourse(column: "slug" | "id", value: string): Promise<CourseWithSyllabus | null> {
  if (isDemo) {
    const c = demoCourses.find((c) => c[column] === value);
    return c ? sortSyllabus(c) : null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(`${COURSE_FIELDS}, modules(id, course_id, title, position, lessons(id, module_id, course_id, title, position, duration_min, is_preview))`)
    .eq(column, value)
    .maybeSingle();
  return data ? sortSyllabus(data as unknown as CourseWithSyllabus) : null;
}

export const getCourseBySlug = (slug: string) => fetchCourse("slug", slug);
export const getCourseById = (id: string) => fetchCourse("id", id);

export function flattenLessons(course: CourseWithSyllabus): (Lesson & { module: Module })[] {
  return course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m })));
}

/** Devuelve null si la persona no tiene acceso (RLS lo filtra). */
export async function getLessonContent(lessonId: string): Promise<LessonContent | null> {
  if (isDemo) return demoContents[lessonId] ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_contents").select("lesson_id, video_url, body").eq("lesson_id", lessonId).maybeSingle();
  return (data as LessonContent) ?? null;
}

export async function getLessonResources(lessonId: string): Promise<(LessonResource & { url: string | null })[]> {
  if (isDemo) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_resources").select("id, lesson_id, title, storage_path").eq("lesson_id", lessonId).order("created_at");
  const resources = (data as LessonResource[]) ?? [];
  return Promise.all(
    resources.map(async (r) => {
      const { data: signed } = await supabase.storage.from("materiales").createSignedUrl(r.storage_path, 60 * 60);
      return { ...r, url: signed?.signedUrl ?? null };
    }),
  );
}

export async function isEnrolled(userId: string | undefined, courseId: string): Promise<boolean> {
  if (isDemo || !userId) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("enrollments").select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  return Boolean(data);
}

export async function getCompletedLessonIds(userId: string | undefined): Promise<Set<string>> {
  if (isDemo || !userId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId);
  return new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id));
}

export async function listMyCourses(userId: string): Promise<CourseWithSyllabus[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("enrollments").select("course_id").eq("user_id", userId).order("created_at");
  const ids = (data ?? []).map((e: { course_id: string }) => e.course_id);
  const courses = await Promise.all(ids.map((id) => getCourseById(id)));
  return courses.filter((c): c is CourseWithSyllabus => c !== null);
}
