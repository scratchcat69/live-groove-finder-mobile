import { useState, useCallback } from "react"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../services/supabase"

export interface EventVenue {
  id: string
  name: string
  city?: string
  state?: string
  address?: string
  latitude?: string
  longitude?: string
}

export interface EventPriceRange {
  min: number
  max: number
  currency: string
}

export interface Event {
  id: string
  name: string
  url: string
  date: string
  time?: string
  dateTime?: string
  status?: string
  imageUrl?: string
  venue: EventVenue | null
  priceRange?: EventPriceRange | null
  genre?: string
  attractions: string[]
}

export interface EventsPage {
  size: number
  totalElements: number
  totalPages: number
  number: number
}

interface UseEventsReturn {
  events: Event[]
  loading: boolean
  error: string | null
  page: EventsPage | null
  fetchEvents: (params: FetchEventsParams) => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

interface FetchEventsParams {
  latitude: number
  longitude: number
  radius?: number
  keyword?: string
  reset?: boolean
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<EventsPage | null>(null)
  const [lastParams, setLastParams] = useState<FetchEventsParams | null>(null)

  const fetchEvents = useCallback(async (params: FetchEventsParams) => {
    const { latitude, longitude, radius = 25, keyword, reset = true } = params

    try {
      setLoading(true)
      setError(null)

      if (reset) {
        setEvents([])
      }

      setLastParams(params)

      const functionUrl = `${SUPABASE_URL}/functions/v1/ticketmaster-events`

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius,
          keyword,
          classificationName: "music",
          size: 20,
          page: 0,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch events")
      }

      setEvents(data.events || [])
      setPage(data.page || null)
    } catch (err) {
      console.error("Error fetching events:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch events")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!lastParams || !page || loading) return
    if (page.number >= page.totalPages - 1) return

    try {
      setLoading(true)

      const functionUrl = `${SUPABASE_URL}/functions/v1/ticketmaster-events`

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          latitude: lastParams.latitude,
          longitude: lastParams.longitude,
          radius: lastParams.radius || 25,
          keyword: lastParams.keyword,
          classificationName: "music",
          size: 20,
          page: page.number + 1,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch events")
      }

      setEvents(prev => [...prev, ...(data.events || [])])
      setPage(data.page || null)
    } catch (err) {
      console.error("Error loading more events:", err)
      setError(err instanceof Error ? err.message : "Failed to load more events")
    } finally {
      setLoading(false)
    }
  }, [lastParams, page, loading])

  const hasMore = page ? page.number < page.totalPages - 1 : false

  return {
    events,
    loading,
    error,
    page,
    fetchEvents,
    loadMore,
    hasMore,
  }
}
