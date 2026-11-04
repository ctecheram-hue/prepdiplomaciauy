import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { listPublishedCourses } from "@/lib/data";

export default async function Home() {
  const courses = await listPublishedCourses();
  return (
    <>
      <section className="hero">
        <div className="contenedor hero-grid">
          <div>
          <h1>Formación en relaciones internacionales y diplomacia</h1>
          <p>
            Cursos en línea para preparar el concurso de ingreso al Servicio Exterior uruguayo y profundizar en
            Derecho Internacional, Política Internacional y Economía y Comercio Internacional.
          </p>
          <div className="acciones">
            <Link href="/cursos" className="btn btn-dorado">Ver cursos</Link>
            <Link href="/ingresar" className="btn btn-linea">Acceder a mi aula</Link>
          </div>
          </div>
          <img src="/logo-blanco.png" alt="Prep Diplomacia Uy" className="hero-logo" />
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor">
          <h2>Cursos disponibles</h2>
          <hr className="filete" />
          {courses.length ? (
            <div className="grilla">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          ) : (
            <p className="muted">Pronto publicaremos nuevos cursos.</p>
          )}
        </div>
      </section>

      <section className="seccion seccion-clara">
        <div className="contenedor grilla">
          <div>
            <h3>Clases grabadas</h3>
            <p>Accede a cada lección cuando quieras y retoma donde la dejaste.</p>
          </div>
          <div>
            <h3>Materiales de la semana</h3>
            <p>Resúmenes, guías y lecturas en PDF disponibles junto a cada clase.</p>
          </div>
          <div>
            <h3>Seguimiento de tu avance</h3>
            <p>Marca las lecciones completadas y visualiza tu progreso en cada curso.</p>
          </div>
        </div>
      </section>
    </>
  );
}
