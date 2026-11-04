import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { fulfillCheckout, getStripe } from "@/lib/stripe";

// Regreso desde Stripe: confirma el pago sin esperar al webhook.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("session_id");
  const user = await getSession();
  let ok = false;
  if (id && user) {
    try {
      const checkout = await getStripe().checkout.sessions.retrieve(id);
      if (checkout.metadata?.user_id === user.userId) ok = await fulfillCheckout(checkout);
    } catch {
      ok = false;
    }
  }
  return NextResponse.redirect(new URL(`/mi-cuenta?compra=${ok ? "ok" : "pendiente"}`, request.url));
}
