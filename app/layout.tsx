import type { Metadata } from "next";
import Link from "next/link";
import { brand, isDemo } from "@/lib/config";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Prep Diplomacia Uy · Cursos", template: "%s · Prep Diplomacia Uy" },
  description: "Cursos de relaciones internacionales, diplomacia y preparación del concurso de ingreso al Servicio Exterior uruguayo.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Open+Sans:wght@400;600&display=swap"
        />
      </head>
      <body>
        {isDemo && (
          <div className="demo-banner">
            Modo demostración: conecta Supabase para activar cuentas, pagos y el panel de administración.
          </div>
        )}
        <header className="header">
          <div className="contenedor">
            <Link href="/" className="marca">
              <img src="/isotipo-blanco.png" alt="" />
              {brand.name}
            </Link>
            <nav className="nav">
              <Link href="/cursos">Cursos</Link>
              {session ? (
                <>
                  <Link href="/mi-cuenta">Mis cursos</Link>
                  {session.profile?.role === "admin" && <Link href="/admin">Administración</Link>}
                  <form action="/auth/salir" method="post" className="inline">
                    <button className="btn btn-chico btn-dorado">Salir</button>
                  </form>
                </>
              ) : (
                <Link href="/ingresar" className="btn btn-chico btn-dorado">Ingresar</Link>
              )}
            </nav>
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="contenedor">
            <div className="footer-marca">
              <img src="/logo-blanco.png" alt={brand.name} />
              <div>Formación en relaciones internacionales y diplomacia</div>
            </div>
            <div>
              <div><a href={`mailto:${brand.email}`}>{brand.email}</a></div>
              <div><a href={brand.instagramUrl}>{brand.instagram}</a></div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
