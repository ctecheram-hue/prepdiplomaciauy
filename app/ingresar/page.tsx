import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDemo } from "@/lib/config";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Ingresar" };

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/mi-cuenta";
  if (await getSession()) redirect(safeNext);
  return (
    <div className="contenedor">
      <div className="caja caja-auth">
        <img src="/logo-azul.png" alt="Prep Diplomacia Uy" className="auth-logo" />
        {isDemo ? (
          <p>El acceso de alumnos se activa al conectar Supabase. Consulta el archivo README para configurarlo.</p>
        ) : (
          <AuthForm next={safeNext} initialError={error ? "El enlace venció o es inválido. Solicita uno nuevo." : undefined} />
        )}
      </div>
    </div>
  );
}
