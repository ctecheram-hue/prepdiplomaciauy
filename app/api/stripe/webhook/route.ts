import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { fulfillCheckout, getStripe } from "@/lib/stripe";

// Stripe avisa aquí cada pago confirmado (evento checkout.session.completed).
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook sin configurar" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await fulfillCheckout(event.data.object as Stripe.Checkout.Session);
  }
  return NextResponse.json({ received: true });
}
