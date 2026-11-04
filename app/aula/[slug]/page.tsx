import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { flattenLessons, getCompletedLessonIds, getCourseBySlug } from "@/lib/data";

/** Lleva al alumno a la primera lección pendiente. */
export default async function AulaIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const lessons = flattenLessons(course);
  if (!lessons.length) redirect(`/cursos/${slug}`);
  const session = await getSession();
  const done = await getCompletedLessonIds(session?.userId);
  const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  redirect(`/aula/${slug}/${next.id}`);
}
