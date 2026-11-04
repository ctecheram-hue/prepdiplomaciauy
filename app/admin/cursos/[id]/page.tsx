import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createLesson, createModule, deleteCourse, deleteModule, updateCourse, updateModule,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CourseForm } from "@/components/CourseForm";
import { Flash } from "@/components/Flash";
import { getCourseById } from "@/lib/data";
import { formatDuration } from "@/lib/format";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> };

export default async function EditarCurso({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const course = await getCourseById(id);
  if (!course) notFound();

  return (
    <>
      <p className="small" style={{ margin: 0 }}><Link href="/admin">Cursos</Link> / {course.title}</p>
      <h1 style={{ marginTop: 8 }}>{course.title}</h1>
      <hr className="filete" />
      <Flash error={error} ok={ok} />

      <h2>Temario</h2>
      {course.modules.map((m) => (
        <div key={m.id} className="modulo-admin">
          <header>
            <form action={updateModule} className="fila-acciones" style={{ flex: 1 }}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="course_id" value={course.id} />
              <input name="position" type="number" defaultValue={m.position} style={{ width: 64 }} aria-label="Orden" className="btn-chico" />
              <input name="title" defaultValue={m.title} required style={{ flex: 1, minWidth: 180, padding: "6px 10px" }} aria-label="Título del módulo" />
              <button className="btn btn-chico btn-linea">Guardar</button>
            </form>
            <form action={deleteModule}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="course_id" value={course.id} />
              <ConfirmButton message={`¿Eliminar el módulo «${m.title}» y todas sus lecciones?`} className="btn btn-chico btn-peligro">Eliminar</ConfirmButton>
            </form>
          </header>
          <ol>
            {m.lessons.map((l) => (
              <li key={l.id}>
                <span>
                  {l.position}. <Link href={`/admin/lecciones/${l.id}`}>{l.title}</Link>{" "}
                  {l.is_preview && <span className="etiqueta">Vista previa</span>}
                </span>
                <span className="muted small">{formatDuration(l.duration_min ?? 0)}</span>
              </li>
            ))}
            <li>
              <form action={createLesson} className="fila-acciones" style={{ width: "100%" }}>
                <input type="hidden" name="module_id" value={m.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <input name="title" placeholder="Título de la nueva lección" required style={{ flex: 1, minWidth: 200, padding: "6px 10px" }} />
                <button className="btn btn-chico">+ Lección</button>
              </form>
            </li>
          </ol>
        </div>
      ))}
      <form action={createModule} className="fila-acciones caja" style={{ marginBottom: 40 }}>
        <input type="hidden" name="course_id" value={course.id} />
        <input name="title" placeholder="Título del nuevo módulo (p. ej. Derecho Internacional)" required style={{ flex: 1, minWidth: 220, padding: "8px 10px" }} />
        <button className="btn btn-chico">+ Módulo</button>
      </form>

      <h2>Datos del curso</h2>
      <CourseForm course={course} action={updateCourse} submit="Guardar cambios" />

      <form action={deleteCourse} style={{ marginTop: 32 }}>
        <input type="hidden" name="id" value={course.id} />
        <ConfirmButton message="¿Eliminar este curso con todo su contenido y matrículas? Esta acción es definitiva." className="btn btn-peligro">
          Eliminar curso
        </ConfirmButton>
      </form>
    </>
  );
}
