import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface AudDResult {
  status: "success" | "error"
  result: {
    artist: string
    title: string
    album: string
    release_date: string
    label: string
    timecode: string
    song_link: string
    spotify?: {
      album?: {
        name: string
        images?: Array<{ url: string }>
      }
      external_urls?: { spotify: string }
      id?: string
    }
    apple_music?: {
      url?: string
    }
  } | null
  error?: {
    error_code: number
    error_message: string
  }
}

interface RecognitionResponse {
  success: boolean
  type: "commercial" | "humming" | "not_found"
  song?: {
    title: string
    artist: string
    album?: string
    releaseDate?: string
    spotifyUrl?: string
    confidence: number
    matchType: "fingerprint" | "melody"
  }
  error?: string
  debug?: string
}

// Call AudD API
async function recognizeWithAudD(
  audioBase64: string,
  apiToken: string
): Promise<AudDResult> {
  // Decode base64 to raw bytes for file upload
  const audioBytes = decodeBase64(audioBase64)

  const formData = new FormData()
  formData.append("api_token", apiToken)
  formData.append("return", "spotify")
  formData.append("file", new Blob([audioBytes], { type: "audio/m4a" }), "sample.m4a")

  const response = await fetch("https://api.audd.io/", {
    method: "POST",
    body: formData,
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`AudD API error: ${response.status} ${response.statusText} - ${responseText}`)
  }

  return JSON.parse(responseText)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { audioBase64, userId, location } = await req.json()

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "No audio data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ~1MB base64 limit (roughly 10s of 44.1kHz mono audio)
    const MAX_AUDIO_BASE64_LENGTH = 1_400_000
    if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: "Audio data too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate location if provided
    if (location) {
      if (location.latitude !== undefined && (location.latitude < -90 || location.latitude > 90)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid latitude" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      if (location.longitude !== undefined && (location.longitude < -180 || location.longitude > 180)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid longitude" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    // Tier-based monthly recognition limit
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get subscription tier
        const { data: tier } = await supabase.rpc("get_user_subscription_tier", { _user_id: userId })
        const userTier = tier || "free"

        // Get monthly usage
        const { data: count } = await supabase.rpc("get_recognition_count_this_month", { p_user_id: userId })
        const usage = count || 0

        const limits: Record<string, number> = { free: 5, discovery: 50, premium: 999999 }
        if (usage >= (limits[userTier] ?? 5)) {
          return new Response(
            JSON.stringify({ success: false, error: "Recognition limit reached.", limitReached: true }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }
    }

    // Get AudD API token from environment
    const apiToken = Deno.env.get("AUDD_API_TOKEN")

    if (!apiToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Recognition service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const auddResult = await recognizeWithAudD(audioBase64, apiToken)

    let response: RecognitionResponse

    if (auddResult.status === "error") {
      response = {
        success: false,
        type: "not_found",
        error: auddResult.error?.error_message || "Recognition service error",
        debug: `AudD error code: ${auddResult.error?.error_code}`,
      }
    } else if (auddResult.result) {
      const match = auddResult.result
      const spotifyUrl = match.spotify?.external_urls?.spotify
        || (match.spotify?.id ? `https://open.spotify.com/track/${match.spotify.id}` : undefined)

      response = {
        success: true,
        type: "commercial",
        song: {
          title: match.title,
          artist: match.artist,
          album: match.album || undefined,
          releaseDate: match.release_date || undefined,
          spotifyUrl,
          confidence: 1.0, // AudD returns a match or nothing — no partial scores
          matchType: "fingerprint",
        },
      }
    } else {
      // No match
      response = {
        success: true,
        type: "not_found",
      }
    }

    // Save discovery to database if we found a match and have a user
    if (response.song && userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { error } = await supabase.from("discoveries").insert({
          discovered_by_user_id: userId,
          song_title: response.song.title,
          song_artist: response.song.artist,
          song_metadata: {
            album: response.song.album,
            releaseDate: response.song.releaseDate,
            spotifyUrl: response.song.spotifyUrl,
            confidence: response.song.confidence,
            matchType: response.song.matchType,
          },
          location: location?.name,
          latitude: location?.latitude,
          longitude: location?.longitude,
        }).select()

        if (error) {
          console.error("Database insert error:", error.message)
        }
      } else {
        console.error("Missing Supabase credentials for database save")
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Recognition error:", error)
    return new Response(
      JSON.stringify({ success: false, error: String(error), type: "not_found" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
