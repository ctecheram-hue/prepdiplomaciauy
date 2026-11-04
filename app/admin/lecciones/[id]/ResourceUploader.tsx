"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addResource } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";

// Sube el archivo directo a Supabase Storage desde el navegador (sin límite de tamaño del servidor).
export function ResourceUploader({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const file = form.get("file") as File;
    if (!file?.size) return;
    const title = String(form.get("title")).trim() || file.name.replace(/\.[^.]+$/, "");
    const safeName = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_");
    const path = `${courseId}/${lessonId}/${Date.now()}-${safeName}`;

    setBusy(true);
    setError("");
    const { error: upErr } = await createClient().storage.from("materiales").upload(path, file, { contentType: file.type });
    const err = upErr ? upErr.message : await addResource(lessonId, title, path);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    formEl.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form caja">
      {error && <div className="aviso aviso-error">{error}</div>}
      <div className="fila">
        <label>Archivo (PDF, Word, etc.)<input type="file" name="file" required /></label>
        <label>Nombre visible (opcional)<input name="title" placeholder="Resumen semana 1" /></label>
      </div>
      <div><button className="btn btn-chico" disabled={busy}>{busy ? "Subiendo…" : "Subir material"}</button></div>
    </form>
  );
}
