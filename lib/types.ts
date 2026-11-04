export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  price_cents: number;
  currency: string;
  published: boolean;
  position: number;
};

export type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  position: number;
  duration_min: number | null;
  is_preview: boolean;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons: Lesson[];
};

export type CourseWithSyllabus = Course & { modules: Module[] };

export type LessonContent = {
  lesson_id: string;
  video_url: string | null;
  body: string | null;
};

export type LessonResource = {
  id: string;
  lesson_id: string;
  title: string;
  storage_path: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "student" | "admin";
};
