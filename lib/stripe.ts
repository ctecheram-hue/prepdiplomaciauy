import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
  return new Stripe(key);
}

/** Registra la matrícula de una sesión de Checkout pagada. Es idempotente. */
export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return false;
  const userId = session.metadata?.user_id;
  const courseId = session.metadata?.course_id;
  if (!userId || !courseId) return false;
  const { error } = await createAdminClient()
    .from("enrollments")
    .upsert(
      { user_id: userId, course_id: courseId, source: "stripe", stripe_session_id: session.id, amount_cents: session.amount_total },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );
  if (error) throw error;
  return true;
}
