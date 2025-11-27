import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { userId, priceId, successUrl, cancelUrl } = await req.json();

    if (!userId || !priceId || !successUrl || !cancelUrl) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the user's email from auth
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      console.error("Error fetching user", userError);
      return new Response("User not found", { status: 400, headers: corsHeaders });
    }

    const email = userData.user.email;

    // Check or create user_subscriptions row
    let { data: sub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error("Error loading subscription", subError);
      return new Response("Error loading subscription", { status: 500, headers: corsHeaders });
    }

    if (!sub) {
      const { data: newSub, error: insertError } = await supabase
        .from("user_subscriptions")
        .insert({ user_id: userId, plan: "free", status: "active" })
        .select("*")
        .single();

      if (insertError) {
        console.error("Error creating subscription row", insertError);
        return new Response("Error creating subscription", { status: 500, headers: corsHeaders });
      }

      sub = newSub;
    }

    // Ensure Stripe customer exists
    let customerId = sub.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;

      await supabase
        .from("user_subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("id", sub.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in create-checkout-session", err);
    return new Response("Error creating checkout session", { status: 500, headers: corsHeaders });
  }
});