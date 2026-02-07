import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14?target=deno"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify JWT and get user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || authHeader.replace("Bearer ", "")

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { successUrl, cancelUrl } = await req.json()

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
    const priceId = Deno.env.get("STRIPE_PRICE_ID_PREMIUM")
    if (!stripeKey || !priceId) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" })
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user already has a stripe_customer_id
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // Upsert subscription row with customer ID
      await supabase.from("subscriptions").upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: "user_id" }
      )
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${supabaseUrl}/functions/v1/create-checkout-session?success=true`,
      cancel_url: cancelUrl || `${supabaseUrl}/functions/v1/create-checkout-session?canceled=true`,
      metadata: { supabase_user_id: user.id },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Checkout session error:", error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
