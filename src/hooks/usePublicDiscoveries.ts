import { useState, useEffect, useCallback } from "react"
import { supabase } from "../services/supabase"

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
}

interface UsePublicDiscoveriesReturn {
  discoveries: PublicDiscovery[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePublicDiscoveries(limit: number = 50): UsePublicDiscoveriesReturn {
  const [discoveries, setDiscoveries] = useState<PublicDiscovery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDiscoveries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("discoveries")
        .select("id, song_title, song_artist, song_metadata, location, discovered_at, discovered_by_user_id")
        .order("discovered_at", { ascending: false })
        .limit(limit)

      if (fetchError) {
        console.error("Error fetching public discoveries:", fetchError)
        setError(fetchError.message)
        return
      }

      setDiscoveries(data || [])
    } catch (err) {
      console.error("Error fetching public discoveries:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch discoveries")
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchDiscoveries()
  }, [fetchDiscoveries])

  return {
    discoveries,
    loading,
    error,
    refresh: fetchDiscoveries,
  }
}
