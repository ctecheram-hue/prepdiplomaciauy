import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { siteUrl } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Crea una sesión de Stripe Checkout con el precio vigente del curso.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const courseId = String(form.get("courseId") ?? "");
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/ingresar", request.url), 303);

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, subtitle, price_cents, currency, published")
    .eq("id", courseId)
    .maybeSingle();
  if (!course || !course.published || course.price_cents <= 0) {
    return NextResponse.redirect(new URL("/cursos", request.url), 303);
  }

  const { data: existing } = await supabase.from("enrollments").select("id").eq("user_id", session.userId).eq("course_id", course.id).maybeSingle();
  if (existing) return NextResponse.redirect(new URL(`/aula/${course.slug}`, request.url), 303);

  const checkout = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: session.profile?.email,
    client_reference_id: session.userId,
    metadata: { user_id: session.userId, course_id: course.id },
    payment_intent_data: { metadata: { user_id: session.userId, course_id: course.id } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: course.currency,
          unit_amount: course.price_cents,
          product_data: { name: course.title, ...(course.subtitle ? { description: course.subtitle } : {}) },
        },
      },
    ],
    allow_promotion_codes: true,
    locale: "es",
    success_url: `${siteUrl}/compra/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cursos/${course.slug}?pago=cancelado`,
  });

  return NextResponse.redirect(checkout.url!, 303);
}
