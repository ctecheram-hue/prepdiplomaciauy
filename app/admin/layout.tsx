import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Administración" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <section className="seccion">
      <div className="contenedor">
        <nav className="admin-nav">
          <Link href="/admin" className="btn btn-linea btn-chico">Cursos</Link>
          <Link href="/admin/alumnos" className="btn btn-linea btn-chico">Alumnos</Link>
          <Link href="/admin/cursos/nuevo" className="btn btn-chico">+ Nuevo curso</Link>
        </nav>
        {children}
      </div>
    </section>
  );
}
