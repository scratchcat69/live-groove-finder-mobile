import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../services/supabase"
import { queryKeys } from "../services/queryClient"

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

export interface EventAttraction {
  id: string
  name: string
  imageUrl: string | null
  url: string | null
  genre: string | null
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
  attractions: EventAttraction[]
}

export interface EventsPage {
  size: number
  totalElements: number
  totalPages: number
  number: number
}

interface EventsResponse {
  success: boolean
  events: Event[]
  page: EventsPage
  error?: string
}

interface UseEventsParams {
  latitude: number | null
  longitude: number | null
  radius?: number
  keyword?: string
  enabled?: boolean
}

async function fetchEventsPage(
  params: { latitude: number; longitude: number; radius: number; keyword?: string },
  pageParam: number
): Promise<EventsResponse> {
  const functionUrl = `${SUPABASE_URL}/functions/v1/ticketmaster-events`

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius,
      keyword: params.keyword,
      classificationName: "music",
      size: 20,
      page: pageParam,
    }),
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch events")
  }

  return {
    success: true,
    events: data.events ?? [],
    page: data.page ?? { size: 20, totalElements: 0, totalPages: 0, number: 0 },
  }
}

export function useEvents({ latitude, longitude, radius = 25, keyword, enabled = true }: UseEventsParams) {
  const queryClient = useQueryClient()

  const hasLocation = latitude != null && longitude != null
  const queryEnabled = enabled && hasLocation

  const {
    data,
    isLoading,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.events.ticketmaster(
      latitude ?? 0,
      longitude ?? 0,
      radius,
      keyword
    ),
    queryFn: ({ pageParam }) =>
      fetchEventsPage(
        { latitude: latitude!, longitude: longitude!, radius, keyword },
        pageParam
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.page.number < lastPage.page.totalPages - 1) {
        return lastPage.page.number + 1
      }
      return undefined
    },
    enabled: queryEnabled,
  })

  const events = data?.pages.flatMap((p) => p.events) ?? []

  const refresh = () => {
    if (queryEnabled) {
      refetch()
    }
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  return {
    events,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refresh,
    loadMore,
    hasMore: !!hasNextPage,
    isFetchingNextPage,
  }
}
