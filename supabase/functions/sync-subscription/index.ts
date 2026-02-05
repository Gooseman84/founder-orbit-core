 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@14.21.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 const logStep = (step: string, details?: Record<string, unknown>) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
   console.log(`[SYNC-SUBSCRIPTION] ${step}${detailsStr}`);
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     logStep("Function started");
 
     const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
     if (!stripeKey) {
       throw new Error("STRIPE_SECRET_KEY is not set");
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
     const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
       auth: { persistSession: false },
     });
 
     // Authenticate user
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       throw new Error("No authorization header provided");
     }
 
     const token = authHeader.replace("Bearer ", "");
     const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
     if (userError || !userData.user) {
       throw new Error(`Authentication error: ${userError?.message || "No user found"}`);
     }
 
     const userId = userData.user.id;
     const userEmail = userData.user.email;
     logStep("User authenticated", { userId, email: userEmail });
 
     // Get existing subscription record to find stripe_customer_id
     const { data: existingSub, error: subError } = await supabaseClient
       .from("user_subscriptions")
       .select("stripe_customer_id")
       .eq("user_id", userId)
       .maybeSingle();
 
     if (subError) {
       logStep("Error fetching subscription", { error: subError.message });
     }
 
     const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
 
     // Find customer - first by stored ID, then by email
     let customerId = existingSub?.stripe_customer_id;
     
     if (!customerId && userEmail) {
       logStep("No stored customer ID, searching by email");
       const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
       if (customers.data.length > 0) {
         customerId = customers.data[0].id;
         logStep("Found customer by email", { customerId });
       }
     }
 
     if (!customerId) {
       logStep("No Stripe customer found");
       return new Response(
         JSON.stringify({ synced: false, reason: "no_customer" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
   // Fetch subscriptions from Stripe
   const subscriptions: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
       customer: customerId,
       status: "all",
       limit: 10,
     });
 
   // Find the most relevant subscription (active or trialing)
   const activeSub: Stripe.Subscription | undefined = subscriptions.data.find(
     (s: Stripe.Subscription) => s.status === "active" || s.status === "trialing"
     );
 
     if (!activeSub) {
     logStep("No active subscription found", {
       subscriptionCount: subscriptions.data.length,
       statuses: subscriptions.data.map((s: Stripe.Subscription) => s.status)
       });
       return new Response(
         JSON.stringify({ synced: false, reason: "no_active_subscription" }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     logStep("Found active subscription", {
       subscriptionId: activeSub.id,
       status: activeSub.status,
       currentPeriodEnd: new Date(activeSub.current_period_end * 1000).toISOString(),
     });
 
     // Determine plan and renewal period from subscription
     const plan = "pro"; // All paid subscriptions are pro for now
     const status = activeSub.status;
     const currentPeriodEnd = new Date(activeSub.current_period_end * 1000).toISOString();
     const cancelAt = activeSub.cancel_at 
       ? new Date(activeSub.cancel_at * 1000).toISOString() 
       : null;
     
     // Determine renewal period from price interval
     let renewalPeriod: string | null = null;
     if (activeSub.items.data.length > 0) {
       const priceInterval = activeSub.items.data[0].price.recurring?.interval;
       if (priceInterval === "month") renewalPeriod = "month";
       else if (priceInterval === "year") renewalPeriod = "year";
     }
 
     // Update or insert subscription record
     const { error: upsertError } = await supabaseClient
       .from("user_subscriptions")
       .upsert({
         user_id: userId,
         plan,
         status,
         stripe_customer_id: customerId,
         stripe_subscription_id: activeSub.id,
         current_period_end: currentPeriodEnd,
         cancel_at: cancelAt,
         renewal_period: renewalPeriod,
       }, {
         onConflict: "user_id",
       });
 
     if (upsertError) {
       logStep("Error upserting subscription", { error: upsertError.message });
       throw new Error(`Database update failed: ${upsertError.message}`);
     }
 
     logStep("Subscription synced successfully", { plan, status, renewalPeriod });
 
     return new Response(
       JSON.stringify({
         synced: true,
         plan,
         status,
         currentPeriodEnd,
         renewalPeriod,
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : String(error);
     logStep("ERROR", { message: errorMessage });
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
     );
   }
 });