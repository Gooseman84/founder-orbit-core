import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    if (!sig) {
      return new Response("Missing signature", { status: 400 });
    }

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;

        // Mark plan as pro after checkout completes
        await supabase
          .from("user_subscriptions")
          .update({
            plan: "pro",
            status: "active",
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabase
          .from("user_subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            plan: "pro", // later you can map different prices → different plans
            status: sub.status,
            current_period_end: new Date(
              sub.current_period_end * 1000
            ).toISOString(),
            cancel_at: sub.cancel_at
              ? new Date(sub.cancel_at * 1000).toISOString()
              : null,
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabase
          .from("user_subscriptions")
          .update({
            plan: "free",
            status: "canceled",
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      default: {
        console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error handling Stripe webhook", err);
    return new Response("Webhook error", { status: 500 });
  }
});