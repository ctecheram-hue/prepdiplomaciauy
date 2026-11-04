import Link from "next/link";
import { notFound } from "next/navigation";
import { enrollFree } from "@/app/actions";
import { getSession } from "@/lib/auth";
import { brand, isDemo, isStripeConfigured } from "@/lib/config";
import { flattenLessons, getCourseBySlug, isEnrolled } from "@/lib/data";
import { formatDuration, formatPrice, renderMarkdown, totalMinutes } from "@/lib/format";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pago?: string }> };

export async function generateMetadata({ params }: Props) {
  const course = await getCourseBySlug((await params).slug);
  return { title: course?.title ?? "Curso", description: course?.subtitle ?? undefined };
}

export default async function CoursePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { pago } = await searchParams;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const session = await getSession();
  const enrolled = await isEnrolled(session?.userId, course.id);
  const lessons = flattenLessons(course);
  const free = course.price_cents === 0;

  let cta: React.ReactNode;
  if (enrolled) {
    cta = <Link href={`/aula/${course.slug}`} className="btn btn-dorado">Ir al aula</Link>;
  } else if (isDemo) {
    cta = <button className="btn" disabled>Inscripción disponible al conectar Supabase</button>;
  } else if (!session) {
    cta = <Link href={`/ingresar?next=/cursos/${course.slug}`} className="btn btn-dorado">Inscribirme</Link>;
  } else if (free) {
    cta = (
      <form action={enrollFree}>
        <input type="hidden" name="slug" value={course.slug} />
        <button className="btn btn-dorado">Inscribirme gratis</button>
      </form>
    );
  } else if (isStripeConfigured) {
    cta = (
      <form action="/api/checkout" method="post">
        <input type="hidden" name="courseId" value={course.id} />
        <button className="btn btn-dorado">Comprar curso</button>
      </form>
    );
  } else {
    cta = <a href={`mailto:${brand.email}?subject=${encodeURIComponent(course.title)}`} className="btn btn-dorado">Consultar inscripción</a>;
  }

  return (
    <section className="seccion">
      <div className="contenedor ficha">
        <div>
          <p className="muted small" style={{ margin: 0 }}><Link href="/cursos">Cursos</Link> / {course.title}</p>
          <h1 style={{ marginTop: 8 }}>{course.title}</h1>
          {course.subtitle && <p className="muted" style={{ fontStyle: "italic", fontSize: "1.1rem" }}>{course.subtitle}</p>}
          <hr className="filete" />
          {pago === "cancelado" && <div className="aviso">El pago fue cancelado. Puedes intentarlo nuevamente cuando quieras.</div>}
          <div className="prosa" dangerouslySetInnerHTML={{ __html: renderMarkdown(course.description) }} />

          <h2 style={{ marginTop: 40 }}>Temario</h2>
          <div className="temario">
            {course.modules.map((m, i) => (
              <details key={m.id} open={i === 0}>
                <summary>
                  <span>{m.title}</span>
                  <span className="small muted">{m.lessons.length} lecciones</span>
                </summary>
                <ol>
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      <span>
                        {l.is_preview || enrolled ? <Link href={`/aula/${course.slug}/${l.id}`}>{l.title}</Link> : l.title}{" "}
                        {l.is_preview && !enrolled && <span className="etiqueta">Vista previa</span>}
                      </span>
                      <span className="muted small">{formatDuration(l.duration_min ?? 0)}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </div>

        <aside className="compra">
          <div className="precio">{formatPrice(course.price_cents, course.currency)}</div>
          {cta}
          <ul>
            <li>{lessons.length} lecciones{totalMinutes(lessons) ? ` · ${formatDuration(totalMinutes(lessons))}` : ""}</li>
            <li>Acceso en línea desde cualquier dispositivo</li>
            <li>Materiales descargables en PDF</li>
            <li>Consultas: <a href={`mailto:${brand.email}`}>{brand.email}</a></li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
