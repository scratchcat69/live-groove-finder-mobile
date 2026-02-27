import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"
import { useAuthStore } from "../stores/authStore"

export interface Discovery {
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
  latitude?: number | null
  longitude?: number | null
  discovered_at: string | null
}

interface UseDiscoveriesReturn {
  discoveries: Discovery[]
  totalCount: number | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  deleteDiscovery: (id: string) => Promise<boolean>
}

export function useDiscoveries(limit: number = 10): UseDiscoveriesReturn {
  const user = useAuthStore((state) => state.user)
  const qc = useQueryClient()
  const userId = user?.id

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.discoveries.byUser(userId ?? ""), limit],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("discoveries")
        .select("*", { count: "exact" })
        .eq("discovered_by_user_id", userId!)
        .order("discovered_at", { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)
      return { discoveries: (data as Discovery[]) ?? [], totalCount: count }
    },
    enabled: !!userId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discoveries").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id: string) => {
      const key = [...queryKeys.discoveries.byUser(userId ?? ""), limit]
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData(key, (old: typeof data) => {
        if (!old) return old
        return {
          discoveries: old.discoveries.filter((d) => d.id !== id),
          totalCount: old.totalCount !== null ? old.totalCount - 1 : null,
        }
      })
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        const key = [...queryKeys.discoveries.byUser(userId ?? ""), limit]
        qc.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.discoveries.all })
    },
  })

  const deleteDiscovery = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id)
      return true
    } catch {
      return false
    }
  }

  const refresh = async () => {
    await qc.invalidateQueries({
      queryKey: queryKeys.discoveries.byUser(userId ?? ""),
    })
  }

  return {
    discoveries: data?.discoveries ?? [],
    totalCount: data?.totalCount ?? null,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch discoveries") : null,
    refresh,
    deleteDiscovery,
  }
}
