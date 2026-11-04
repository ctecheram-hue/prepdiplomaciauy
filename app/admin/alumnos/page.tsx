import { enrollEmails, removeEnrollment, removeInvite } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Flash } from "@/components/Flash";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ curso?: string; error?: string; ok?: string }> };

const sourceLabel: Record<string, string> = { stripe: "Stripe", manual: "Manual", free: "Gratuito" };

export default async function Alumnos({ searchParams }: Props) {
  const { curso, error, ok } = await searchParams;
  const supabase = await createClient();
  const { data: courses } = await supabase.from("courses").select("id, title").order("position");

  let enrollmentsQuery = supabase
    .from("enrollments")
    .select("id, source, amount_cents, created_at, course_id, courses(title), profiles(email, full_name)")
    .order("created_at", { ascending: false });
  let invitesQuery = supabase.from("enrollment_invites").select("id, email, created_at, courses(title)").order("created_at", { ascending: false });
  if (curso) {
    enrollmentsQuery = enrollmentsQuery.eq("course_id", curso);
    invitesQuery = invitesQuery.eq("course_id", curso);
  }
  const [{ data: enrollments }, { data: invites }] = await Promise.all([enrollmentsQuery, invitesQuery]);
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);

  return (
    <>
      <h1>Alumnos</h1>
      <hr className="filete" />
      <Flash error={error} ok={ok} />

      <h2>Matricular alumnos</h2>
      <form action={enrollEmails} className="form caja" style={{ marginBottom: 40 }}>
        <label>
          Curso
          <select name="course_id" required defaultValue={curso ?? ""}>
            <option value="" disabled>Elige un curso</option>
            {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <label>
          Correos electrónicos (uno por línea o separados por comas)
          <textarea name="emails" rows={5} placeholder={"alumna@correo.com\nalumno@correo.com"} required style={{ fontFamily: "inherit" }} />
        </label>
        <p className="small muted" style={{ margin: 0 }}>
          Útil para transferencias bancarias, becas o para dar acceso a quienes ya cursan en Moodle. Quien todavía no tiene cuenta
          recibe el acceso automáticamente al registrarse con ese mismo correo.
        </p>
        <div><button className="btn">Matricular</button></div>
      </form>

      <form className="fila-acciones" style={{ marginBottom: 16 }}>
        <select name="curso" defaultValue={curso ?? ""} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--borde)" }}>
          <option value="">Todos los cursos</option>
          {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button className="btn btn-chico btn-linea">Filtrar</button>
        <span className="muted small">{enrollments?.length ?? 0} matrículas</span>
      </form>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead><tr><th>Alumno</th><th>Curso</th><th>Origen</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            {(enrollments ?? []).map((e) => {
              const p = one(e.profiles as unknown as { email: string; full_name: string | null } | null);
              const c = one(e.courses as unknown as { title: string } | null);
              return (
                <tr key={e.id}>
                  <td>{p?.full_name || "Sin nombre"}<div className="small muted">{p?.email}</div></td>
                  <td>{c?.title}</td>
                  <td>{sourceLabel[e.source] ?? e.source}</td>
                  <td>{new Date(e.created_at).toLocaleDateString("es-UY")}</td>
                  <td>
                    <form action={removeEnrollment}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton message="¿Quitar el acceso de este alumno al curso?" className="btn btn-chico btn-peligro">Quitar acceso</ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(invites?.length ?? 0) > 0 && (
        <>
          <h2 style={{ marginTop: 40 }}>Invitaciones pendientes</h2>
          <p className="muted small">Personas matriculadas que todavía no crearon su cuenta.</p>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Correo</th><th>Curso</th><th>Fecha</th><th></th></tr></thead>
              <tbody>
                {invites!.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td>{one(i.courses as unknown as { title: string } | null)?.title}</td>
                    <td>{new Date(i.created_at).toLocaleDateString("es-UY")}</td>
                    <td>
                      <form action={removeInvite}>
                        <input type="hidden" name="id" value={i.id} />
                        <button className="btn btn-chico btn-peligro">Cancelar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
