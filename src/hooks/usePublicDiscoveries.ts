import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"

export interface PublicDiscovery {
  id: string
  song_title: string | null
  song_artist: string | null
  song_metadata: {
    album?: string
    matchType?: string
    confidence?: number
    spotifyUrl?: string
  } | null
  location?: string | null
  discovered_at: string | null
  discovered_by_user_id: string | null
  profiles?: {
    username: string | null
    avatar_url: string | null
  } | null
}

interface UsePublicDiscoveriesReturn {
  discoveries: PublicDiscovery[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePublicDiscoveries(limit: number = 50): UsePublicDiscoveriesReturn {
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.discoveries.recent(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discoveries")
        .select(
          "id, song_title, song_artist, song_metadata, location, discovered_at, discovered_by_user_id, profiles!discovered_by_user_id(username, avatar_url)"
        )
        .order("discovered_at", { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)
      return (data as unknown as PublicDiscovery[]) ?? []
    },
  })

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.discoveries.recent(limit) })
  }

  return {
    discoveries: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch discoveries") : null,
    refresh,
  }
}
