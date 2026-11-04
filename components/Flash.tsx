export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <div className="aviso aviso-error">{error}</div>;
  if (ok) return <div className="aviso aviso-ok">{ok === "1" ? "Cambios guardados." : ok}</div>;
  return null;
}
