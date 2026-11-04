import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Course } from "@/lib/types";

export function CourseCard({ course, progress }: { course: Course; progress?: number }) {
  return (
    <Link href={progress === undefined ? `/cursos/${course.slug}` : `/aula/${course.slug}`} className="tarjeta">
      <div className="portada" style={course.cover_url ? { backgroundImage: `linear-gradient(transparent 40%, rgba(21,61,99,.9)), url(${course.cover_url})` } : undefined}>
        <span>{course.title}</span>
      </div>
      <div className="cuerpo">
        {course.subtitle && <p className="muted small" style={{ margin: 0 }}>{course.subtitle}</p>}
        {progress === undefined ? (
          <div className="pie">
            <span>{formatPrice(course.price_cents, course.currency)}</span>
            <span className="small">Ver curso →</span>
          </div>
        ) : (
          <div className="pie" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div className="barra"><div style={{ width: `${progress}%` }} /></div>
            <span className="small">{progress}% completado · Continuar →</span>
          </div>
        )}
      </div>
    </Link>
  );
}
