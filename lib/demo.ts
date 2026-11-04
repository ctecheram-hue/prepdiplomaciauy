// Datos de demostración: se muestran solo mientras Supabase no está configurado.
// Sirven para previsualizar el diseño. El contenido real se carga desde /admin.
import type { CourseWithSyllabus, LessonContent } from "@/lib/types";

const C1 = "00000000-0000-4000-8000-000000000001";
const C2 = "00000000-0000-4000-8000-000000000002";

function lesson(course_id: string, module_id: string, n: number, title: string, duration_min: number, is_preview = false) {
  return { id: `${module_id}-l${n}`, module_id, course_id, title, position: n, duration_min, is_preview };
}

export const demoCourses: CourseWithSyllabus[] = [
  {
    id: C1,
    slug: "concurso-mrree-2027",
    title: "Curso de Preparación del Concurso MRREE 2027",
    subtitle: "Preparación integral para el ingreso al Servicio Exterior uruguayo",
    description:
      "Preparación completa para las ocho etapas del concurso de ingreso al Ministerio de Relaciones Exteriores.\n\n" +
      "Trabajamos las cuatro áreas temáticas: Derecho Internacional, Política Internacional, Economía y Comercio Internacional e Historia y Cultura del Uruguay.\n\n" +
      "Incluye clases grabadas, materiales de la semana en PDF, autoevaluaciones y simulacros de la prueba escrita y la oral.",
    cover_url: null,
    price_cents: 0,
    currency: "usd",
    published: true,
    position: 1,
    modules: [
      {
        id: "m0000000-0000-4000-8000-000000000101",
        course_id: C1,
        title: "Introducción al concurso",
        position: 1,
        lessons: [],
      },
      {
        id: "m0000000-0000-4000-8000-000000000102",
        course_id: C1,
        title: "Derecho Internacional",
        position: 2,
        lessons: [],
      },
      {
        id: "m0000000-0000-4000-8000-000000000103",
        course_id: C1,
        title: "Política Internacional",
        position: 3,
        lessons: [],
      },
      {
        id: "m0000000-0000-4000-8000-000000000104",
        course_id: C1,
        title: "Economía y Comercio Internacional",
        position: 4,
        lessons: [],
      },
    ],
  },
  {
    id: C2,
    slug: "carta-de-motivacion-y-cv",
    title: "Taller de carta de motivación y CV",
    subtitle: "Curso de ejemplo para mostrar el catálogo",
    description: "Curso de ejemplo. Reemplázalo desde el panel de administración.",
    cover_url: null,
    price_cents: 0,
    currency: "usd",
    published: true,
    position: 2,
    modules: [
      {
        id: "m0000000-0000-4000-8000-000000000201",
        course_id: C2,
        title: "Taller",
        position: 1,
        lessons: [],
      },
    ],
  },
];

const [intro, di, pi, eci] = demoCourses[0].modules;
intro.lessons = [
  lesson(C1, intro.id, 1, "Las ocho etapas del concurso", 20, true),
  lesson(C1, intro.id, 2, "Cómo usar el aula y los materiales de la semana", 10, true),
];
di.lessons = [
  lesson(C1, di.id, 1, "Fuentes del Derecho Internacional", 45),
  lesson(C1, di.id, 2, "Derecho de los tratados", 50),
];
pi.lessons = [lesson(C1, pi.id, 1, "Teorías de las Relaciones Internacionales", 55)];
eci.lessons = [lesson(C1, eci.id, 1, "El sistema multilateral de comercio", 50)];
demoCourses[1].modules[0].lessons = [lesson(C2, demoCourses[1].modules[0].id, 1, "Presentación del taller", 10, true)];

export const demoContents: Record<string, LessonContent> = {
  [intro.lessons[0].id]: {
    lesson_id: intro.lessons[0].id,
    video_url: null,
    body:
      "## Las ocho etapas\n\n" +
      "Según las Nuevas Bases del llamado 2026 (R.M. 27/2026), que rigen como referencia hasta la publicación de las bases 2027, el concurso tiene ocho etapas.\n\n" +
      "| Etapa | Carácter | Peso |\n|---|---|---|\n" +
      "| 1. Documentación | Eliminatoria | Sin puntaje |\n" +
      "| 2. Méritos | Puntúa | 8% |\n" +
      "| 3. Múltiple opción | Eliminatoria | Sin puntaje |\n" +
      "| 4. Prueba de inglés | Eliminatoria | Sin puntaje |\n" +
      "| 5. Escrita | Eliminatoria | 30% |\n" +
      "| 6. Psicotécnica | No eliminatoria | 15% |\n" +
      "| 7. Oral | No eliminatoria | 30% |\n" +
      "| 8. Entrevista de aptitud diplomática | No eliminatoria | 17% |\n\n" +
      "> Contenido de demostración. Cada lección se edita desde el panel de administración.",
  },
  [intro.lessons[1].id]: {
    lesson_id: intro.lessons[1].id,
    video_url: null,
    body: "Cada semana se habilitan las lecciones y los materiales correspondientes.\n\nMarca cada lección como completada para seguir tu avance.",
  },
};
