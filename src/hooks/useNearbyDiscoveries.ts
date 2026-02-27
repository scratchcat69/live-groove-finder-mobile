import { useQuery } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"
import type { Discovery } from "./useDiscoveries"

export type TimeFilter = "live" | "today" | "week"

function getCutoffDate(filter: TimeFilter): string {
  const now = new Date()
  switch (filter) {
    case "live":
      now.setHours(now.getHours() - 2)
      break
    case "today":
      now.setHours(now.getHours() - 24)
      break
    case "week":
      now.setDate(now.getDate() - 7)
      break
  }
  return now.toISOString()
}

interface UseNearbyDiscoveriesReturn {
  discoveries: Discovery[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useNearbyDiscoveries(
  latitude: number | null,
  longitude: number | null,
  timeFilter: TimeFilter
): UseNearbyDiscoveriesReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.discoveries.nearby(
      latitude ?? 0,
      longitude ?? 0,
      timeFilter
    ),
    queryFn: async () => {
      const cutoff = getCutoffDate(timeFilter)

      const { data, error } = await supabase
        .from("discoveries")
        .select(
          "id, song_title, song_artist, song_metadata, location, latitude, longitude, discovered_at"
        )
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .gte("discovered_at", cutoff)
        .order("discovered_at", { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)
      return (data as Discovery[]) ?? []
    },
    enabled: latitude !== null && longitude !== null,
    staleTime: timeFilter === "live" ? 60 * 1000 : 5 * 60 * 1000,
  })

  return {
    discoveries: data ?? [],
    loading: isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch nearby discoveries"
      : null,
    refresh: refetch,
  }
}
