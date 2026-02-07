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

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return new Response("Missing signature", { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return new Response(`Webhook Error: ${String(err)}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (subscriptionId) {
          // Fetch subscription details from Stripe
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)

          await supabase
            .from("subscriptions")
            .update({
              tier: "premium",
              status: "active",
              stripe_subscription_id: subscriptionId,
              current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
              cancel_at_period_end: stripeSub.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          trialing: "trial",
        }

        await supabase
          .from("subscriptions")
          .update({
            status: statusMap[subscription.status] || subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from("subscriptions")
          .update({
            tier: "free",
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error("Webhook handler error:", error)
    // Still return 200 so Stripe doesn't retry
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
