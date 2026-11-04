import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { requireUser } from "@/lib/auth";
import { flattenLessons, getCompletedLessonIds, listMyCourses } from "@/lib/data";
import { updateName } from "./actions";

export const metadata = { title: "Mis cursos" };

export default async function MiCuenta({ searchParams }: { searchParams: Promise<{ compra?: string }> }) {
  const session = await requireUser();
  const { compra } = await searchParams;
  const [courses, done] = await Promise.all([listMyCourses(session.userId), getCompletedLessonIds(session.userId)]);

  return (
    <section className="seccion">
      <div className="contenedor">
        <h1>Hola{session.profile?.full_name ? `, ${session.profile.full_name.split(" ")[0]}` : ""}</h1>
        <hr className="filete" />
        {compra === "ok" && <div className="aviso aviso-ok">¡Gracias por tu compra! Ya tienes acceso al curso.</div>}
        {compra === "pendiente" && (
          <div className="aviso">Estamos confirmando tu pago. El curso aparecerá aquí en unos minutos.</div>
        )}

        <h2>Mis cursos</h2>
        {courses.length ? (
          <div className="grilla">
            {courses.map((c) => {
              const lessons = flattenLessons(c);
              const pct = lessons.length ? Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100) : 0;
              return <CourseCard key={c.id} course={c} progress={pct} />;
            })}
          </div>
        ) : (
          <p>
            Todavía no estás inscripto en ningún curso. <Link href="/cursos">Explora el catálogo</Link>.
          </p>
        )}

        <h2 style={{ marginTop: 48 }}>Mis datos</h2>
        <form action={updateName} className="form caja" style={{ maxWidth: 480 }}>
          <label>Correo electrónico<input value={session.profile?.email ?? ""} disabled /></label>
          <label>Nombre y apellido<input name="full_name" defaultValue={session.profile?.full_name ?? ""} required /></label>
          <div className="fila-acciones">
            <button className="btn">Guardar</button>
            <Link href="/mi-cuenta/clave">Cambiar contraseña</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
