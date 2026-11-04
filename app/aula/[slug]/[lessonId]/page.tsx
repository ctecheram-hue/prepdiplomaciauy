import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleComplete } from "@/app/actions";
import { getSession } from "@/lib/auth";
import { isDemo } from "@/lib/config";
import { flattenLessons, getCompletedLessonIds, getCourseBySlug, getLessonContent, getLessonResources, isEnrolled } from "@/lib/data";
import { renderMarkdown, toEmbed } from "@/lib/format";

type Props = { params: Promise<{ slug: string; lessonId: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  const lesson = course && flattenLessons(course).find((l) => l.id === lessonId);
  return { title: lesson?.title ?? "Aula" };
}

export default async function LessonPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const lessons = flattenLessons(course);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index < 0) notFound();
  const lesson = lessons[index];

  const session = await getSession();
  const [enrolled, done, content, resources] = await Promise.all([
    isEnrolled(session?.userId, course.id),
    getCompletedLessonIds(session?.userId),
    getLessonContent(lesson.id),
    getLessonResources(lesson.id),
  ]);
  const isAdmin = session?.profile?.role === "admin";
  const canSee = enrolled || isAdmin || lesson.is_preview || isDemo;
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const embed = content?.video_url ? toEmbed(content.video_url) : null;
  const completed = done.has(lesson.id);
  const pct = lessons.length ? Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100) : 0;

  return (
    <div className="aula">
      <aside>
        <h2><Link href={`/cursos/${course.slug}`} style={{ textDecoration: "none" }}>{course.title}</Link></h2>
        {enrolled && (
          <div style={{ padding: "0 18px 8px" }}>
            <div className="barra"><div style={{ width: `${pct}%` }} /></div>
            <div className="small muted">{pct}% completado</div>
          </div>
        )}
        {course.modules.map((m) => (
          <div key={m.id}>
            <div className="modulo">{m.title}</div>
            {m.lessons.map((l) => {
              const accessible = enrolled || isAdmin || l.is_preview || isDemo;
              return (
                <Link key={l.id} href={`/aula/${course.slug}/${l.id}`} className={l.id === lesson.id ? "activa" : undefined}>
                  <span className={`check ${done.has(l.id) ? "hecho" : ""}`}>{done.has(l.id) ? "✓" : ""}</span>
                  <span>{l.title}{!accessible && " 🔒"}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <main>
        <p className="muted small" style={{ margin: 0 }}>{lesson.module.title}</p>
        <h1 style={{ marginTop: 4 }}>{lesson.title}</h1>
        <hr className="filete" />

        {!canSee || !content ? (
          <div className="aviso">
            <p style={{ marginTop: 0 }}>Esta lección está disponible para quienes están inscriptos en el curso.</p>
            <Link href={`/cursos/${course.slug}`} className="btn btn-dorado">Ver opciones de inscripción</Link>
          </div>
        ) : (
          <>
            {embed && (
              <div className="video">
                {embed.kind === "iframe" ? (
                  <iframe src={embed.src} title={lesson.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                ) : (
                  <video src={embed.src} controls controlsList="nodownload" />
                )}
              </div>
            )}
            <div className="prosa" dangerouslySetInnerHTML={{ __html: renderMarkdown(content.body) }} />

            {resources.length > 0 && (
              <>
                <h2 style={{ marginTop: 32 }}>Materiales</h2>
                <ul className="recursos">
                  {resources.map((r) => (
                    <li key={r.id}>
                      {r.url ? <a href={r.url} target="_blank" rel="noopener">📄 {r.title}</a> : <span>{r.title}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {enrolled && (
              <form action={toggleComplete} style={{ marginTop: 28 }}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="done" value={completed ? "1" : "0"} />
                <button className={`btn ${completed ? "btn-linea" : ""}`}>
                  {completed ? "✓ Completada · desmarcar" : "Marcar como completada"}
                </button>
              </form>
            )}
          </>
        )}

        <nav className="navegacion">
          {prev ? <Link href={`/aula/${course.slug}/${prev.id}`} className="btn btn-linea">← {prev.title}</Link> : <span />}
          {next && <Link href={`/aula/${course.slug}/${next.id}`} className="btn">{next.title} →</Link>}
        </nav>
      </main>
    </div>
  );
}
