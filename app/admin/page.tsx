import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, slug, title, price_cents, currency, published, enrollments(count), lessons(count)")
    .order("position");

  return (
    <>
      <h1>Cursos</h1>
      <hr className="filete" />
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr><th>Curso</th><th>Estado</th><th>Precio</th><th>Lecciones</th><th>Alumnos</th><th></th></tr>
          </thead>
          <tbody>
            {(courses ?? []).map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/cursos/${c.id}`}>{c.title}</Link></td>
                <td>{c.published ? <span className="etiqueta etiqueta-ok">Publicado</span> : <span className="etiqueta">Borrador</span>}</td>
                <td>{formatPrice(c.price_cents, c.currency)}</td>
                <td>{(c.lessons as unknown as { count: number }[])[0]?.count ?? 0}</td>
                <td>{(c.enrollments as unknown as { count: number }[])[0]?.count ?? 0}</td>
                <td className="fila-acciones">
                  <Link href={`/admin/cursos/${c.id}`} className="btn btn-chico">Editar</Link>
                  <Link href={`/cursos/${c.slug}`} className="btn btn-chico btn-linea">Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!courses?.length && <p className="muted">Todavía no hay cursos. Crea el primero con el botón «Nuevo curso».</p>}
    </>
  );
}
