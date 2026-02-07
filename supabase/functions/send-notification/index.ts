import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface NotificationRequest {
  userId?: string
  userIds?: string[]
  title: string
  body: string
  data?: Record<string, unknown>
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Verify caller is admin or using service role
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the caller's JWT if it's not the service role key
    const token = authHeader.replace("Bearer ", "")
    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Check if caller is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle()

      if (!roleData) {
        return new Response(
          JSON.stringify({ success: false, error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    const { userId, userIds, title, body, data }: NotificationRequest = await req.json()

    if (!title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Determine target users
    const targetUserIds = userIds ?? (userId ? [userId] : [])
    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "userId or userIds required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Filter out users who have push_enabled = false
    const { data: enabledPrefs } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .in("user_id", targetUserIds)
      .eq("push_enabled", false)

    const disabledUserIds = new Set((enabledPrefs ?? []).map((p: { user_id: string }) => p.user_id))
    const enabledUserIds = targetUserIds.filter((id) => !disabledUserIds.has(id))

    if (enabledUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Fetch push tokens for enabled users
    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", enabledUserIds)

    if (tokenError) {
      throw new Error(`Failed to fetch tokens: ${tokenError.message}`)
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Build Expo push messages
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: data ?? {},
    }))

    // Send in batches of 100
    let totalSent = 0
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100)
      const pushResponse = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      })

      if (pushResponse.ok) {
        totalSent += batch.length
      } else {
        console.error("Expo push error:", await pushResponse.text())
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("send-notification error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
