# Prep Diplomacia Uy · Plataforma de cursos

Escuela en línea propia para vender y dictar los cursos de Prep Diplomacia Uy.

## Qué incluye

**Para estudiantes**
- Catálogo público de cursos con temario, precio y lecciones de vista previa gratuitas.
- Registro e ingreso con correo y contraseña, recuperación de contraseña.
- Compra con tarjeta mediante Stripe Checkout (el acceso se activa automáticamente al confirmarse el pago).
- Inscripción directa a cursos gratuitos.
- Aula con video (YouTube, Vimeo, Google Drive, Loom o .mp4), texto de la lección, materiales descargables y botón «Marcar como completada».
- Panel «Mis cursos» con el porcentaje de avance de cada curso.

**Para la administración** (`/admin`)
- Crear, editar, publicar y eliminar cursos (precio en USD, UYU o EUR).
- Organizar el temario en módulos y lecciones, con orden configurable.
- Subir materiales (PDF, Word, etc.) a cada lección. Los archivos son privados y se descargan con enlaces temporales.
- Matricular alumnos a mano pegando una lista de correos (transferencias, becas, alumnos que ya cursan en Moodle). Si la persona aún no tiene cuenta, el acceso se activa solo cuando se registra con ese correo.
- Ver matrículas por curso, con su origen (Stripe, manual o gratuito), y quitar accesos.

**Seguridad.** El contenido pago está protegido en la base de datos con reglas de seguridad por fila (RLS). Aunque alguien conozca la dirección de una lección, el servidor solo entrega el video, el texto y los archivos a quienes tienen matrícula. Las reglas se probaron con usuarios simulados (visitante, alumno inscripto, alumno sin inscripción y administración).

## Tecnología y costos

| Pieza | Servicio | Costo inicial |
|---|---|---|
| Sitio web | Next.js en Vercel | Gratis (plan Hobby) |
| Usuarios, base de datos y archivos | Supabase | Gratis (500 MB de base, 1 GB de archivos) |
| Cobros | Stripe | Sin costo fijo, comisión por venta |
| Videos | Vimeo o YouTube en modo «oculto» | Según el plan elegido |

Los videos se alojan fuera de la plataforma y se enlazan en cada lección. Para cursos pagos conviene Vimeo con privacidad por dominio (solo se reproducen dentro de www.prepdiplomacia.com). Un enlace oculto de YouTube funciona, aunque cualquiera que lo reciba puede verlo.

> El plan gratuito de Supabase pausa el proyecto tras siete días sin actividad. Con alumnos activos esto no ocurre; si el sitio queda inactivo, se reactiva desde el panel de Supabase.

## Puesta en marcha (una sola vez)

### 1. Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (región sugerida São Paulo, `sa-east-1`).
2. Abre **SQL Editor**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo.
3. En **Authentication > URL Configuration** completa:
   - Site URL: `https://www.prepdiplomacia.com`
   - Redirect URLs: `https://www.prepdiplomacia.com/auth/callback` y `http://localhost:3000/auth/callback`
4. En **Project Settings > API** copia la *Project URL*, la clave *anon* y la clave *service_role*.

### 2. Stripe

1. Crea la cuenta en [stripe.com](https://stripe.com) y activa los pagos con los datos de facturación.
2. En **Developers > API keys** copia la *Secret key*.
3. En **Developers > Webhooks** crea un destino con la URL `https://www.prepdiplomacia.com/api/stripe/webhook` y los eventos `checkout.session.completed` y `checkout.session.async_payment_succeeded`. Copia el *Signing secret*.

Los precios se cargan en la plataforma; Stripe recibe el monto de cada curso al momento de la compra, así que no hace falta crear productos en Stripe. Los cupones de descuento creados en Stripe funcionan en el formulario de pago.

### 3. Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com) con GitHub e importa este repositorio.
2. En **Environment Variables** carga las variables de [`.env.example`](.env.example):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://www.prepdiplomacia.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (secreta) |
   | `STRIPE_SECRET_KEY` | Secret key de Stripe |
   | `STRIPE_WEBHOOK_SECRET` | Signing secret del webhook |

3. Publica y, en **Settings > Domains**, conecta `www.prepdiplomacia.com` (o un subdominio como `cursos.prepdiplomacia.com`, ajustando las URL anteriores).

### 4. Cuenta de administración

1. Regístrate en el sitio con `carolina@prepdiplomacia.com`.
2. En Supabase, **SQL Editor**, ejecuta:

   ```sql
   update public.profiles set role = 'admin' where email = 'carolina@prepdiplomacia.com';
   ```

3. Vuelve a ingresar: aparecerá el enlace **Administración** en el menú.

## Uso diario

1. **Nuevo curso.** Administración > Nuevo curso. Mientras «Publicado» esté desmarcado, el curso queda como borrador invisible.
2. **Temario.** Dentro del curso agrega módulos (por ejemplo, Derecho Internacional) y lecciones.
3. **Lección.** Pega el enlace del video, escribe el contenido en Markdown y sube los materiales en PDF. Marca «Vista previa gratuita» en una o dos lecciones para mostrar el curso a interesados.
4. **Alumnos.** Las compras con Stripe se matriculan solas. Para transferencias o becas, usa Administración > Alumnos y pega los correos.

### Formato Markdown rápido

```
## Subtítulo
Texto con **negrita** y *cursiva*.
- Punto de una lista
> Caja destacada (fondo azul claro con borde dorado)
| Columna | Columna |
|---|---|
| dato | dato |
```

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa las claves
npm run dev                  # http://localhost:3000
```

Sin claves de Supabase el sitio arranca en **modo demostración** con cursos de ejemplo, útil para revisar el diseño.

Para probar pagos en local, usa las claves de prueba de Stripe y la [Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC.

## Estructura

```
app/                 Páginas (catálogo, aula, cuenta, administración) y rutas de API
  admin/             Panel de administración y sus acciones
  api/checkout/      Crea el pago en Stripe
  api/stripe/webhook Recibe la confirmación de pago y matricula
components/          Piezas de interfaz reutilizables
lib/                 Datos, sesión, Stripe, formato y datos de demostración
supabase/schema.sql  Base de datos, reglas de seguridad y almacenamiento
public/              Logos (versión azul y blanca, completa e isotipo)
```

## Pendientes sugeridos

- Cargar el precio real de cada curso antes de publicarlo.
- Personalizar los correos de Supabase (Authentication > Email Templates) con la marca y enviarlos desde cursos@prepdiplomacia.com mediante un SMTP propio (Authentication > SMTP Settings); el envío por defecto de Supabase tiene un límite bajo de correos por hora.
