"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setMsg({ ok: false, text: "Las contraseñas deben coincidir." });
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Contraseña actualizada." });
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {msg && <div className={`aviso ${msg.ok ? "aviso-ok" : "aviso-error"}`}>{msg.text}</div>}
      <label>Nueva contraseña<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
      <label>Repite la contraseña<input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></label>
      <button className="btn" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
