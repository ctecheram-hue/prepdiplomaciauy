import type { Course } from "@/lib/types";

export function CourseForm({ course, action, submit }: { course?: Course; action: (f: FormData) => Promise<void>; submit: string }) {
  return (
    <form action={action} className="form caja">
      {course && <input type="hidden" name="id" value={course.id} />}
      <label>Título<input name="title" defaultValue={course?.title} required /></label>
      <label>
        Dirección web (slug)
        <input name="slug" defaultValue={course?.slug} placeholder="se genera a partir del título" pattern="[a-z0-9\-]*" />
      </label>
      <label>Subtítulo<input name="subtitle" defaultValue={course?.subtitle ?? ""} /></label>
      <label>
        Descripción (admite Markdown: **negrita**, listas con -, tablas)
        <textarea name="description" defaultValue={course?.description ?? ""} rows={10} />
      </label>
      <label>URL de imagen de portada (opcional)<input name="cover_url" type="url" defaultValue={course?.cover_url ?? ""} /></label>
      <div className="fila">
        <label>
          Precio (0 = gratuito)
          <input name="price" type="number" min="0" step="0.01" defaultValue={course ? course.price_cents / 100 : 0} />
        </label>
        <label>
          Moneda
          <select name="currency" defaultValue={course?.currency ?? "usd"}>
            <option value="usd">USD (dólares)</option>
            <option value="uyu">UYU (pesos uruguayos)</option>
            <option value="eur">EUR (euros)</option>
          </select>
        </label>
        <label>Orden en el catálogo<input name="position" type="number" defaultValue={course?.position ?? 0} /></label>
      </div>
      <label className="casilla"><input type="checkbox" name="published" defaultChecked={course?.published} /> Publicado (visible en el catálogo)</label>
      <div><button className="btn">{submit}</button></div>
    </form>
  );
}
