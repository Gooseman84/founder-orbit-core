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
      console.error("[stripe-webhook] Missing signature");
      return new Response("Missing signature", { status: 400 });
    }

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log("[stripe-webhook] Event received:", event.type, "ID:", event.id);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
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
        const subscriptionId = session.subscription as string;

        console.log("[stripe-webhook] Checkout completed for customer:", customerId);

        // Get subscription details
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const { error } = await supabase
            .from("user_subscriptions")
            .update({
              stripe_subscription_id: subscriptionId,
              plan: "pro",
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at: subscription.cancel_at 
                ? new Date(subscription.cancel_at * 1000).toISOString() 
                : null,
            })
            .eq("stripe_customer_id", customerId);

          if (error) {
            console.error("[stripe-webhook] Error updating subscription after checkout:", error);
          } else {
            console.log("[stripe-webhook] Subscription activated for customer:", customerId);
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        console.log("[stripe-webhook] Subscription created:", sub.id, "Status:", sub.status);

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            plan: "pro",
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
            renewal_period: sub.items.data[0]?.plan?.interval || null,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("[stripe-webhook] Error on subscription.created:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        console.log("[stripe-webhook] Subscription updated:", sub.id, "Status:", sub.status);

        // Determine plan based on status
        // "trialing" status = user is in Stripe trial, keep plan as "pro" with trialing status
        // "active" = paid subscription, plan = "pro"
        // "canceled" or "unpaid" = downgrade to "trial" (not "free")
        let plan = "pro";
        if (sub.status === "canceled" || sub.status === "unpaid") {
          plan = "trial";
        }

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            plan,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
            renewal_period: sub.items.data[0]?.plan?.interval || null,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("[stripe-webhook] Error on subscription.updated:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        console.log("[stripe-webhook] Subscription deleted/canceled:", sub.id);

        // Downgrade to "trial" instead of "free"
        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            plan: "trial",
            status: "canceled",
            stripe_subscription_id: null,
            cancel_at: null,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("[stripe-webhook] Error on subscription.deleted:", error);
        } else {
          console.log("[stripe-webhook] User downgraded to trial:", customerId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.log("[stripe-webhook] Payment succeeded for customer:", customerId, "Amount:", invoice.amount_paid);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.log("[stripe-webhook] Payment FAILED for customer:", customerId, "Amount:", invoice.amount_due);
        
        // Update status to past_due
        const { error } = await supabase
          .from("user_subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("[stripe-webhook] Error updating to past_due:", error);
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        console.log("[stripe-webhook] Trial ending soon for customer:", customerId, "Ends:", new Date(sub.trial_end! * 1000));
        // Future: Send notification email here
        break;
      }

      default: {
        console.log("[stripe-webhook] Unhandled event type:", event.type);
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[stripe-webhook] Error handling event:", err);
    return new Response(
      JSON.stringify({ error: "Webhook handler error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
