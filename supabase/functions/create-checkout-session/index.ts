import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to determine if we're in test mode
const isTestMode = () => Deno.env.get("STRIPE_TEST_MODE") === "true";

// Get the appropriate Stripe secret key based on mode
const getStripeSecretKey = () => {
  if (isTestMode()) {
    return Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY")!;
  }
  return Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY")!;
};

// Get the appropriate price ID based on mode and plan
const getPriceId = (plan: string) => {
  const isTest = isTestMode();
  
  if (plan === "monthly") {
    if (isTest) {
      return Deno.env.get("STRIPE_PRICE_MONTHLY_TEST") || Deno.env.get("STRIPE_PRICE_PRO_MONTHLY");
    }
    return Deno.env.get("STRIPE_PRICE_MONTHLY_LIVE") || Deno.env.get("STRIPE_PRICE_PRO_MONTHLY");
  } else if (plan === "yearly" || plan === "annual") {
    if (isTest) {
      return Deno.env.get("STRIPE_PRICE_ANNUAL_TEST") || Deno.env.get("STRIPE_PRICE_PRO_YEARLY");
    }
    return Deno.env.get("STRIPE_PRICE_ANNUAL_LIVE") || Deno.env.get("STRIPE_PRICE_PRO_YEARLY");
  }
  
  return null;
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
    const stripeSecretKey = getStripeSecretKey();
    console.log("[create-checkout-session] Mode:", isTestMode() ? "TEST" : "LIVE");
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      console.error("[create-checkout-session] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("[create-checkout-session] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const email = user.email;
    console.log("[create-checkout-session] Authenticated user:", userId, email);

    // ===== END CANONICAL AUTH BLOCK =====

    // Parse request body
    const body = await req.json();
    const { plan, successUrl, cancelUrl } = body;

    // Determine price ID based on plan parameter and test/live mode
    const priceId = getPriceId(plan) || body.priceId;

    if (!priceId) {
      console.error("[create-checkout-session] No price ID found for plan:", plan, "Mode:", isTestMode() ? "TEST" : "LIVE");
      return new Response(
        JSON.stringify({ error: "Invalid plan selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[create-checkout-session] Using price ID:", priceId, "for plan:", plan);

    // Get origin with fallback to production URL
    const origin = req.headers.get("origin") || "https://founder-orbit-core.lovable.app";
    const finalSuccessUrl = successUrl || `${origin}/billing?status=success`;
    const finalCancelUrl = cancelUrl || `${origin}/billing?status=cancelled`;

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Check or create user_subscriptions row
    let { data: sub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error("[create-checkout-session] Error loading subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Error loading subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sub) {
      console.log("[create-checkout-session] Creating new subscription row for user:", userId);
      const { data: newSub, error: insertError } = await supabase
        .from("user_subscriptions")
        .insert({ user_id: userId, plan: "free", status: "active" })
        .select("*")
        .single();

      if (insertError) {
        console.error("[create-checkout-session] Error creating subscription row:", insertError);
        return new Response(
          JSON.stringify({ error: "Error creating subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      sub = newSub;
    }

    // Ensure Stripe customer exists and is valid
    let customerId = sub.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        console.log("[create-checkout-session] Verified existing Stripe customer:", customerId);
      } catch (error) {
        console.log("[create-checkout-session] Stored customer not found in Stripe, will create new one");
        customerId = null;
      }
    }

    if (!customerId) {
      console.log("[create-checkout-session] Creating Stripe customer for:", email);
      const customer = await stripe.customers.create({ 
        email: email!,
        metadata: {
          supabase_user_id: userId,
        }
      });
      customerId = customer.id;

      await supabase
        .from("user_subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("id", sub.id);
    }

    // Check if user already has an active subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (existingSubscriptions.data.length > 0) {
      console.log("[create-checkout-session] User already has active subscription");
      return new Response(
        JSON.stringify({ error: "You already have an active subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-checkout-session] Creating checkout session for customer:", customerId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
        },
      },
      allow_promotion_codes: true,
    });

    console.log("[create-checkout-session] Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-checkout-session] Error:", err);
    return new Response(
      JSON.stringify({ 
        error: "Error creating checkout session",
        details: err instanceof Error ? err.message : "Unknown error"
      }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
