import { CourseCard } from "@/components/CourseCard";
import { listPublishedCourses } from "@/lib/data";

export const metadata = { title: "Cursos" };

export default async function Cursos() {
  const courses = await listPublishedCourses();
  return (
    <section className="seccion">
      <div className="contenedor">
        <h1>Cursos</h1>
        <hr className="filete" />
        <div className="grilla">
          {courses.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
        {!courses.length && <p className="muted">Pronto publicaremos nuevos cursos.</p>}
      </div>
    </section>
  );
}
