-- Prep Diplomacia Uy · Plataforma de cursos
-- Esquema completo de base de datos para Supabase.
-- Ejecutar una sola vez en Supabase > SQL Editor (es idempotente en lo posible).

-- =========================================================
-- 1. Perfiles de usuario
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 2. Catálogo: cursos, módulos, lecciones
-- =========================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  subtitle text,
  description text,              -- Markdown
  cover_url text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd',
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position integer not null default 0
);
create index if not exists modules_course_idx on public.modules (course_id);

-- Metadatos públicos de la lección (título, orden, duración).
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  duration_min integer,
  is_preview boolean not null default false
);
create index if not exists lessons_module_idx on public.lessons (module_id);
create index if not exists lessons_course_idx on public.lessons (course_id);

-- Contenido protegido de la lección (solo alumnos matriculados).
create table if not exists public.lesson_contents (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  video_url text,
  body text                      -- Markdown
);

-- Materiales descargables (archivos en Storage, bucket "materiales").
create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  storage_path text not null,    -- formato: <course_id>/<lesson_id>/<archivo>
  created_at timestamptz not null default now()
);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources (lesson_id);

-- =========================================================
-- 3. Matrículas, invitaciones y progreso
-- =========================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'stripe', 'free')),
  stripe_session_id text unique,
  amount_cents integer,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- Matrícula por correo para personas que todavía no crearon su cuenta.
-- Al registrarse con ese correo, la matrícula se activa automáticamente.
create table if not exists public.enrollment_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (email, course_id)
);

create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- =========================================================
-- 4. Funciones auxiliares
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid() and course_id = p_course_id
  );
$$;

-- Crea el perfil al registrarse y activa invitaciones pendientes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.enrollments (user_id, course_id, source)
  select new.id, i.course_id, 'manual'
  from public.enrollment_invites i
  where i.email = lower(new.email)
  on conflict (user_id, course_id) do nothing;

  delete from public.enrollment_invites where email = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene lessons.course_id coherente con su módulo.
create or replace function public.sync_lesson_course()
returns trigger
language plpgsql
as $$
begin
  select course_id into new.course_id from public.modules where id = new.module_id;
  return new;
end;
$$;

drop trigger if exists lessons_sync_course on public.lessons;
create trigger lessons_sync_course
  before insert or update of module_id on public.lessons
  for each row execute function public.sync_lesson_course();

-- =========================================================
-- 5. Seguridad a nivel de fila (RLS)
-- =========================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_invites enable row level security;
alter table public.lesson_progress enable row level security;

-- Perfiles: cada persona ve el suyo; la administración ve todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_admin());
-- El rol solo se cambia desde el SQL Editor: el alumno solo edita su nombre.
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

-- Cursos: públicos si están publicados.
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select
  using (published or public.is_admin());
drop policy if exists courses_admin on public.courses;
create policy courses_admin on public.courses for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules for select
  using (public.is_admin() or exists (
    select 1 from public.courses c where c.id = course_id and c.published));
drop policy if exists modules_admin on public.modules;
create policy modules_admin on public.modules for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select
  using (public.is_admin() or exists (
    select 1 from public.courses c where c.id = course_id and c.published));
drop policy if exists lessons_admin on public.lessons;
create policy lessons_admin on public.lessons for all
  using (public.is_admin()) with check (public.is_admin());

-- Contenido: lecciones de muestra abiertas; el resto solo con matrícula.
drop policy if exists lesson_contents_select on public.lesson_contents;
create policy lesson_contents_select on public.lesson_contents for select
  using (
    public.is_admin() or exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id and c.published
        and (l.is_preview or public.is_enrolled(l.course_id))
    )
  );
drop policy if exists lesson_contents_admin on public.lesson_contents;
create policy lesson_contents_admin on public.lesson_contents for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists lesson_resources_select on public.lesson_resources;
create policy lesson_resources_select on public.lesson_resources for select
  using (
    public.is_admin() or exists (
      select 1 from public.lessons l
      where l.id = lesson_id and public.is_enrolled(l.course_id)
    )
  );
drop policy if exists lesson_resources_admin on public.lesson_resources;
create policy lesson_resources_admin on public.lesson_resources for all
  using (public.is_admin()) with check (public.is_admin());

-- Matrículas: cada alumno ve las suyas. Las altas las hace la administración
-- o el webhook de Stripe (con la clave de servicio, que omite RLS).
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists enrollments_admin on public.enrollments;
create policy enrollments_admin on public.enrollments for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists invites_admin on public.enrollment_invites;
create policy invites_admin on public.enrollment_invites for all
  using (public.is_admin()) with check (public.is_admin());

-- Progreso: cada alumno gestiona el suyo, solo en cursos donde está matriculado.
drop policy if exists progress_select on public.lesson_progress;
create policy progress_select on public.lesson_progress for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists progress_insert on public.lesson_progress;
create policy progress_insert on public.lesson_progress for insert
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and public.is_enrolled(l.course_id))
  );
drop policy if exists progress_delete on public.lesson_progress;
create policy progress_delete on public.lesson_progress for delete
  using (user_id = auth.uid());

-- =========================================================
-- 6. Almacenamiento de materiales (bucket privado)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('materiales', 'materiales', false)
on conflict (id) do nothing;

-- Ruta de cada archivo: <course_id>/<lesson_id>/<archivo>
create or replace function public.can_read_material(p_name text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course text := split_part(p_name, '/', 1);
begin
  if v_course !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_enrolled(v_course::uuid);
end;
$$;

drop policy if exists materiales_read on storage.objects;
create policy materiales_read on storage.objects for select
  using (
    bucket_id = 'materiales' and (
      public.is_admin() or public.can_read_material(name)
    )
  );
drop policy if exists materiales_admin_write on storage.objects;
create policy materiales_admin_write on storage.objects for insert
  with check (bucket_id = 'materiales' and public.is_admin());
drop policy if exists materiales_admin_update on storage.objects;
create policy materiales_admin_update on storage.objects for update
  using (bucket_id = 'materiales' and public.is_admin());
drop policy if exists materiales_admin_delete on storage.objects;
create policy materiales_admin_delete on storage.objects for delete
  using (bucket_id = 'materiales' and public.is_admin());
