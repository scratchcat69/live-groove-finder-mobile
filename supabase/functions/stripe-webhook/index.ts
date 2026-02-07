import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14?target=deno"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
}

// Verify Stripe webhook signature using Web Crypto API (Deno-compatible)
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [key, val] = part.split("=")
    acc[key.trim()] = val
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts["t"]
  const signature = parts["v1"]

  if (!timestamp || !signature) return false

  // Check timestamp is within 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp)
  if (age > 300) return false

  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  return expected === signature
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

  // Verify signature using Web Crypto API
  const valid = await verifyStripeSignature(body, sig, webhookSecret)
  if (!valid) {
    console.error("Webhook signature verification failed")
    return new Response("Invalid signature", { status: 400 })
  }

  const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } }

  try {
    console.log("Processing webhook event:", event.type)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        console.log("Checkout completed. Customer:", customerId, "Sub:", subscriptionId)

        if (subscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)

          const { error } = await supabase
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

          if (error) console.error("DB update error:", error.message)
          else console.log("Updated subscription to premium for customer:", customerId)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        const customerId = subscription.customer as string

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          trialing: "trial",
        }

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: statusMap[subscription.status as string] || (subscription.status as string),
            cancel_at_period_end: subscription.cancel_at_period_end as boolean,
            current_period_start: new Date((subscription.current_period_start as number) * 1000).toISOString(),
            current_period_end: new Date((subscription.current_period_end as number) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)

        if (error) console.error("DB update error:", error.message)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object
        const customerId = subscription.customer as string

        const { error } = await supabase
          .from("subscriptions")
          .update({
            tier: "free",
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)

        if (error) console.error("DB update error:", error.message)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error("Webhook handler error:", error)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
