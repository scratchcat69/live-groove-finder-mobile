import { useState, useEffect, useCallback } from "react"
import { supabase } from "../services/supabase"
import { useAuthStore } from "../stores/authStore"

export interface Discovery {
  id: string
  song_title: string
  song_artist: string
  song_metadata: {
    album?: string
    matchType?: string
    confidence?: number
    spotifyUrl?: string
  }
  location?: string
  discovered_at: string
}

interface UseDiscoveriesReturn {
  discoveries: Discovery[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  deleteDiscovery: (id: string) => Promise<boolean>
}

export function useDiscoveries(limit: number = 10): UseDiscoveriesReturn {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((state) => state.user)

  const fetchDiscoveries = useCallback(async () => {
    if (!user?.id) {
      setDiscoveries([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("discoveries")
        .select("*")
        .eq("discovered_by_user_id", user.id)
        .order("discovered_at", { ascending: false })
        .limit(limit)

      if (fetchError) {
        console.error("Error fetching discoveries:", fetchError)
        setError(fetchError.message)
        return
      }

      setDiscoveries(data || [])
    } catch (err) {
      console.error("Error fetching discoveries:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch discoveries")
    } finally {
      setLoading(false)
    }
  }, [user?.id, limit])

  useEffect(() => {
    fetchDiscoveries()
  }, [fetchDiscoveries])

  const deleteDiscovery = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("discoveries")
        .delete()
        .eq("id", id)

      if (deleteError) {
        console.error("Error deleting discovery:", deleteError)
        return false
      }

      // Remove from local state immediately
      setDiscoveries((prev) => prev.filter((d) => d.id !== id))
      return true
    } catch (err) {
      console.error("Error deleting discovery:", err)
      return false
    }
  }, [])

  return {
    discoveries,
    loading,
    error,
    refresh: fetchDiscoveries,
    deleteDiscovery,
  }
}
