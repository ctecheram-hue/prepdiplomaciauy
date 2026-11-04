import { marked } from "marked";

export function formatPrice(cents: number, currency: string) {
  if (cents === 0) return "Gratuito";
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function totalMinutes(lessons: { duration_min: number | null }[]) {
  return lessons.reduce((sum, l) => sum + (l.duration_min ?? 0), 0);
}

export function formatDuration(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m ? `${m} min` : ""}`.trim() : `${m} min`;
}

/** Convierte enlaces de YouTube, Vimeo, Google Drive o Loom en URL embebible. */
export function toEmbed(url: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed${u.pathname}` };
    if (host === "vimeo.com") {
      const [id, hash] = u.pathname.split("/").filter(Boolean);
      return { kind: "iframe", src: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}` };
    }
    if (host === "player.vimeo.com") return { kind: "iframe", src: url };
    if (host === "drive.google.com") {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      return m ? { kind: "iframe", src: `https://drive.google.com/file/d/${m[1]}/preview` } : null;
    }
    if (host === "loom.com") return { kind: "iframe", src: url.replace("/share/", "/embed/") };
    if (/\.(mp4|webm|m3u8)$/i.test(u.pathname)) return { kind: "video", src: url };
    return { kind: "iframe", src: url };
  } catch {
    return null;
  }
}

/** El Markdown lo redacta solo la administración, por eso se renderiza tal cual. */
export function renderMarkdown(md: string | null) {
  return md ? (marked.parse(md, { async: false }) as string) : "";
}
