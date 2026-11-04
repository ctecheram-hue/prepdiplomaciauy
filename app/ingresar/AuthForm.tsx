"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "ingresar" | "registro" | "recuperar";

const titles: Record<Mode, string> = {
  ingresar: "Ingresar a tu aula",
  registro: "Crear tu cuenta",
  recuperar: "Recuperar contraseña",
};

export function AuthForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("ingresar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [info, setInfo] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password") ?? "");
    const supabase = createClient();
    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    try {
      if (mode === "ingresar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Correo o contraseña incorrectos.");
        router.replace(next);
        router.refresh();
      } else if (mode === "registro") {
        const full_name = String(form.get("full_name")).trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name }, emailRedirectTo: callback },
        });
        if (error) throw new Error(error.message.includes("registered") ? "Ese correo ya tiene una cuenta. Ingresa con tu contraseña." : error.message);
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setInfo("Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/mi-cuenta/clave`,
        });
        if (error) throw error;
        setInfo("Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: "1.6rem" }}>{titles[mode]}</h1>
      <hr className="filete" />
      {error && <div className="aviso aviso-error">{error}</div>}
      {info && <div className="aviso aviso-ok">{info}</div>}
      <form className="form" onSubmit={onSubmit}>
        {mode === "registro" && (
          <label>Nombre y apellido<input name="full_name" required autoComplete="name" /></label>
        )}
        <label>Correo electrónico<input name="email" type="email" required autoComplete="email" /></label>
        {mode !== "recuperar" && (
          <label>
            Contraseña
            <input name="password" type="password" required minLength={8} autoComplete={mode === "registro" ? "new-password" : "current-password"} />
          </label>
        )}
        <button className="btn" disabled={loading}>
          {loading ? "Procesando…" : mode === "ingresar" ? "Ingresar" : mode === "registro" ? "Crear cuenta" : "Enviar enlace"}
        </button>
      </form>
      <div className="small" style={{ marginTop: 20, display: "grid", gap: 6 }}>
        {mode !== "ingresar" && <a href="#" onClick={(e) => { e.preventDefault(); setMode("ingresar"); }}>Ya tengo cuenta: ingresar</a>}
        {mode !== "registro" && <a href="#" onClick={(e) => { e.preventDefault(); setMode("registro"); }}>Crear una cuenta nueva</a>}
        {mode !== "recuperar" && <a href="#" onClick={(e) => { e.preventDefault(); setMode("recuperar"); }}>Olvidé mi contraseña</a>}
      </div>
    </>
  );
}
