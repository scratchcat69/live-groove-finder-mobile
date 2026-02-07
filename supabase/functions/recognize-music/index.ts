import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encodeBase64, decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ACRCloudResult {
  status: {
    code: number
    msg: string
  }
  metadata?: {
    music?: Array<{
      title: string
      artists: Array<{ name: string }>
      album?: { name: string }
      release_date?: string
      external_metadata?: {
        spotify?: { track?: { id: string } }
      }
      score: number
    }>
    humming?: Array<{
      title: string
      artists: Array<{ name: string }>
      album?: { name: string }
      score: number
    }>
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

// Generate ACRCloud HMAC-SHA1 signature using Web Crypto API
async function generateSignature(
  accessKey: string,
  accessSecret: string,
  timestamp: number,
  dataType: string = "audio"
): Promise<string> {
  const stringToSign = `POST\n/v1/identify\n${accessKey}\n${dataType}\n1\n${timestamp}`

  const encoder = new TextEncoder()
  const keyData = encoder.encode(accessSecret)
  const messageData = encoder.encode(stringToSign)

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData)
  return encodeBase64(new Uint8Array(signature))
}

// Call ACRCloud API
async function recognizeWithACRCloud(
  audioBase64: string,
  accessKey: string,
  accessSecret: string,
  host: string
): Promise<ACRCloudResult> {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = await generateSignature(accessKey, accessSecret, timestamp)

  // Decode base64 to get raw audio bytes
  const audioBytes = decodeBase64(audioBase64)

  const formData = new FormData()
  formData.append("access_key", accessKey)
  formData.append("data_type", "audio")
  formData.append("signature", signature)
  formData.append("signature_version", "1")
  formData.append("timestamp", timestamp.toString())
  formData.append("sample_bytes", audioBytes.length.toString())
  formData.append("sample", new Blob([audioBytes], { type: "audio/m4a" }), "sample.m4a")

  const response = await fetch(`https://${host}/v1/identify`, {
    method: "POST",
    body: formData,
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`ACRCloud API error: ${response.status} ${response.statusText} - ${responseText}`)
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

    // Rate limit: max 20 recognition attempts per user per hour
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from("discoveries")
          .select("id", { count: "exact", head: true })
          .eq("discovered_by_user_id", userId)
          .gte("discovered_at", oneHourAgo)
        if (count !== null && count >= 20) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }
    }

    // Get ACRCloud credentials from environment
    const accessKey = Deno.env.get("ACRCLOUD_ACCESS_KEY")
    const accessSecret = Deno.env.get("ACRCLOUD_ACCESS_SECRET")
    const host = Deno.env.get("ACRCLOUD_HOST") || "identify-us-west-2.acrcloud.com"

    if (!accessKey || !accessSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Recognition service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const acrResult = await recognizeWithACRCloud(audioBase64, accessKey, accessSecret, host)

    let response: RecognitionResponse

    // Minimum confidence threshold (0-1 scale, e.g., 0.60 = 60%)
    // Below this, we treat as "not found" to avoid showing wrong results
    const MIN_CONFIDENCE = 0.60

    // Check for music match (fingerprint)
    if (acrResult.status.code === 0 && acrResult.metadata?.music?.length) {
      const match = acrResult.metadata.music[0]
      const confidence = match.score

      if (confidence >= MIN_CONFIDENCE) {
        const spotifyId = match.external_metadata?.spotify?.track?.id

        response = {
          success: true,
          type: "commercial",
          song: {
            title: match.title,
            artist: match.artists.map(a => a.name).join(", "),
            album: match.album?.name,
            releaseDate: match.release_date,
            spotifyUrl: spotifyId ? `https://open.spotify.com/track/${spotifyId}` : undefined,
            confidence: match.score,
            matchType: "fingerprint",
          },
        }
      } else {
        response = {
          success: true,
          type: "not_found",
          debug: `Low confidence match (${Math.round(confidence * 100)}%) - below ${Math.round(MIN_CONFIDENCE * 100)}% threshold`,
        }
      }
    }
    // Check for humming match (melody)
    else if (acrResult.status.code === 0 && acrResult.metadata?.humming?.length) {
      const match = acrResult.metadata.humming[0]
      const confidence = match.score

      if (confidence >= MIN_CONFIDENCE) {
        response = {
          success: true,
          type: "humming",
          song: {
            title: match.title,
            artist: match.artists.map(a => a.name).join(", "),
            album: match.album?.name,
            confidence: match.score,
            matchType: "melody",
          },
        }
      } else {
        response = {
          success: true,
          type: "not_found",
          debug: `Low confidence humming match (${Math.round(confidence * 100)}%) - below ${Math.round(MIN_CONFIDENCE * 100)}% threshold`,
        }
      }
    }
    // No match found
    else {
      response = {
        success: true,
        type: "not_found",
        debug: `ACRCloud code: ${acrResult.status.code}, msg: ${acrResult.status.msg}`,
      }
    }

    // Save discovery to database if we found a match and have a user
    if (response.song && userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data, error } = await supabase.from("discoveries").insert({
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
