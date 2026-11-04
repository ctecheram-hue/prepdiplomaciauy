import { createCourse } from "@/app/admin/actions";
import { CourseForm } from "@/components/CourseForm";
import { Flash } from "@/components/Flash";

export default async function NuevoCurso({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Nuevo curso</h1>
      <hr className="filete" />
      <Flash error={error} />
      <CourseForm action={createCourse} submit="Crear curso" />
    </>
  );
}
