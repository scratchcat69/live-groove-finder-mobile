import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TICKETMASTER_API_KEY = Deno.env.get("TICKETMASTER_API_KEY") || "QBXcrIkba6KZyyauM1Vj0uNVkmbCCIT3"
const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface EventRequest {
  latitude: number
  longitude: number
  radius?: number // in miles, default 25
  keyword?: string
  classificationName?: string // "music", "sports", etc.
  startDateTime?: string // ISO 8601
  endDateTime?: string // ISO 8601
  size?: number // results per page, default 20
  page?: number
}

interface TicketmasterEvent {
  id: string
  name: string
  type: string
  url: string
  dates: {
    start: {
      localDate: string
      localTime?: string
      dateTime?: string
    }
    status?: {
      code: string
    }
  }
  images?: Array<{
    url: string
    ratio?: string
    width?: number
    height?: number
  }>
  _embedded?: {
    venues?: Array<{
      id: string
      name: string
      city?: { name: string }
      state?: { name: string; stateCode: string }
      address?: { line1: string }
      location?: { latitude: string; longitude: string }
    }>
    attractions?: Array<{
      id: string
      name: string
      type: string
      images?: Array<{
        url: string
        ratio?: string
        width?: number
        height?: number
      }>
      url?: string
      classifications?: Array<{
        segment?: { name: string }
        genre?: { name: string }
        subGenre?: { name: string }
      }>
    }>
  }
  priceRanges?: Array<{
    type: string
    currency: string
    min: number
    max: number
  }>
  classifications?: Array<{
    segment?: { name: string }
    genre?: { name: string }
    subGenre?: { name: string }
  }>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const requestData: EventRequest = await req.json()
    const {
      latitude,
      longitude,
      radius = 25,
      keyword,
      classificationName = "music",
      startDateTime,
      endDateTime,
      size = 20,
      page = 0
    } = requestData

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ success: false, error: "Location coordinates required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Build query params
    const params = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      latlong: `${latitude},${longitude}`,
      radius: radius.toString(),
      unit: "miles",
      size: size.toString(),
      page: page.toString(),
      sort: "date,asc",
    })

    if (keyword) {
      params.append("keyword", keyword)
    }

    if (classificationName) {
      params.append("classificationName", classificationName)
    }

    // Default to events starting from now
    const now = new Date().toISOString().split(".")[0] + "Z"
    params.append("startDateTime", startDateTime || now)

    if (endDateTime) {
      params.append("endDateTime", endDateTime)
    }

    const url = `${TICKETMASTER_BASE_URL}/events.json?${params.toString()}`
    console.log("Fetching events from:", url.replace(TICKETMASTER_API_KEY, "***"))

    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      console.error("Ticketmaster API error:", data)
      return new Response(
        JSON.stringify({
          success: false,
          error: data.fault?.faultstring || "Failed to fetch events"
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Transform events to a cleaner format
    const events = (data._embedded?.events || []).map((event: TicketmasterEvent) => {
      const venue = event._embedded?.venues?.[0]
      const image = event.images?.find(img => img.ratio === "16_9" && (img.width || 0) >= 500)
        || event.images?.[0]
      const priceRange = event.priceRanges?.[0]
      const genre = event.classifications?.[0]?.genre?.name
      const attractions = (event._embedded?.attractions || []).map(a => {
        const attractionImage = a.images?.find(img => img.ratio === "16_9" && (img.width || 0) >= 200)
          || a.images?.find(img => img.ratio === "1_1")
          || a.images?.[0]
        return {
          id: a.id,
          name: a.name,
          imageUrl: attractionImage?.url || null,
          url: a.url || null,
          genre: a.classifications?.[0]?.genre?.name || null,
        }
      })

      return {
        id: event.id,
        name: event.name,
        url: event.url,
        date: event.dates.start.localDate,
        time: event.dates.start.localTime,
        dateTime: event.dates.start.dateTime,
        status: event.dates.status?.code,
        imageUrl: image?.url,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.stateCode,
          address: venue.address?.line1,
          latitude: venue.location?.latitude,
          longitude: venue.location?.longitude,
        } : null,
        priceRange: priceRange ? {
          min: priceRange.min,
          max: priceRange.max,
          currency: priceRange.currency,
        } : null,
        genre,
        attractions,
      }
    })

    const pageInfo = data.page || {}

    return new Response(
      JSON.stringify({
        success: true,
        events,
        page: {
          size: pageInfo.size || size,
          totalElements: pageInfo.totalElements || 0,
          totalPages: pageInfo.totalPages || 0,
          number: pageInfo.number || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error in ticketmaster-events function:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
