import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLesson, deleteResource, updateLesson } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Flash } from "@/components/Flash";
import { getCourseById } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { ResourceUploader } from "./ResourceUploader";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> };

export default async function EditarLeccion({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, module_id, course_id, title, position, duration_min, is_preview, lesson_contents(video_url, body), lesson_resources(id, title, storage_path)")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) notFound();
  const course = await getCourseById(lesson.course_id);
  if (!course) notFound();
  const content = (Array.isArray(lesson.lesson_contents) ? lesson.lesson_contents[0] : lesson.lesson_contents) as
    | { video_url: string | null; body: string | null }
    | null;

  return (
    <>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/admin">Cursos</Link> / <Link href={`/admin/cursos/${course.id}`}>{course.title}</Link> / {lesson.title}
      </p>
      <h1 style={{ marginTop: 8 }}>{lesson.title}</h1>
      <hr className="filete" />
      <Flash error={error} ok={ok} />
      <p><Link href={`/aula/${course.slug}/${lesson.id}`}>Ver la lección como alumno →</Link></p>

      <form action={updateLesson} className="form caja">
        <input type="hidden" name="id" value={lesson.id} />
        <label>Título<input name="title" defaultValue={lesson.title} required /></label>
        <div className="fila">
          <label>
            Módulo
            <select name="module_id" defaultValue={lesson.module_id}>
              {course.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </label>
          <label>Orden<input name="position" type="number" defaultValue={lesson.position} /></label>
          <label>Duración (min)<input name="duration_min" type="number" min="0" defaultValue={lesson.duration_min ?? ""} /></label>
        </div>
        <label>
          Enlace del video (YouTube o Vimeo en modo oculto, Google Drive, Loom o archivo .mp4)
          <input name="video_url" type="url" defaultValue={content?.video_url ?? ""} placeholder="https://vimeo.com/..." />
        </label>
        <label>
          Contenido de la lección (Markdown)
          <textarea name="body" defaultValue={content?.body ?? ""} rows={16} />
        </label>
        <label className="casilla">
          <input type="checkbox" name="is_preview" defaultChecked={lesson.is_preview} /> Vista previa gratuita (visible sin inscripción)
        </label>
        <div><button className="btn">Guardar lección</button></div>
      </form>

      <h2 style={{ marginTop: 40 }}>Materiales descargables</h2>
      <p className="muted small">Los archivos quedan privados: solo los descargan alumnos inscriptos, con enlaces que vencen en una hora.</p>
      <ul className="recursos" style={{ marginBottom: 16 }}>
        {(lesson.lesson_resources ?? []).map((r) => (
          <li key={r.id} className="fila-acciones" style={{ justifyContent: "space-between", border: "1px solid var(--borde)", borderLeft: "4px solid var(--dorado)", borderRadius: 8, padding: "10px 14px" }}>
            <span>📄 {r.title}</span>
            <form action={deleteResource}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="storage_path" value={r.storage_path} />
              <ConfirmButton message={`¿Eliminar «${r.title}»?`} className="btn btn-chico btn-peligro">Eliminar</ConfirmButton>
            </form>
          </li>
        ))}
      </ul>
      <ResourceUploader lessonId={lesson.id} courseId={course.id} />

      <form action={deleteLesson} style={{ marginTop: 40 }}>
        <input type="hidden" name="id" value={lesson.id} />
        <input type="hidden" name="course_id" value={course.id} />
        <ConfirmButton message="¿Eliminar esta lección y sus materiales?" className="btn btn-peligro">Eliminar lección</ConfirmButton>
      </form>
    </>
  );
}
