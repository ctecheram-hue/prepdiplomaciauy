import Link from "next/link";

export default function NotFound() {
  return (
    <section className="seccion">
      <div className="contenedor">
        <h1>Página no encontrada</h1>
        <hr className="filete" />
        <p>La dirección que buscas cambió o ya está disponible en otro lugar.</p>
        <Link href="/cursos" className="btn">Ver cursos</Link>
      </div>
    </section>
  );
}
