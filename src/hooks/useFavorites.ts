import { useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/src/services/supabase"
import { queryKeys } from "@/src/services/queryClient"
import { useUser } from "@/src/stores/authStore"

interface FavoriteRow {
  id: string
  favorite_id: string
  favorite_type: string
}

export function useFavorites(favoriteType: string = "artist") {
  const user = useUser()
  const qc = useQueryClient()

  const { data: favorites = [], isLoading } = useQuery<FavoriteRow[]>({
    queryKey: queryKeys.favorites.byType(user?.id ?? "", favoriteType),
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await (supabase
        .from("favorites") as any)
        .select("id, favorite_id, favorite_type")
        .eq("user_id", user.id)
        .eq("favorite_type", favoriteType)
      if (error) throw new Error(error.message)
      return (data as FavoriteRow[]) ?? []
    },
    enabled: !!user,
  })

  const favoriteIdSet = new Set(favorites.map((f) => f.favorite_id))

  const isFavorite = useCallback(
    (id: string) => favoriteIdSet.has(id),
    [favoriteIdSet]
  )

  const favoriteIds = useCallback(
    () => Array.from(favoriteIdSet),
    [favoriteIdSet]
  )

  const addMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      if (!user) throw new Error("Not authenticated")
      const { error } = await (supabase.from("favorites") as any).insert({
        user_id: user.id,
        favorite_id: favoriteId,
        favorite_type: favoriteType,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      if (user) {
        qc.invalidateQueries({
          queryKey: queryKeys.favorites.byType(user.id, favoriteType),
        })
        qc.invalidateQueries({
          queryKey: queryKeys.favorites.all(user.id),
        })
      }
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      if (!user) throw new Error("Not authenticated")
      const { error } = await (supabase
        .from("favorites") as any)
        .delete()
        .eq("user_id", user.id)
        .eq("favorite_id", favoriteId)
        .eq("favorite_type", favoriteType)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      if (user) {
        qc.invalidateQueries({
          queryKey: queryKeys.favorites.byType(user.id, favoriteType),
        })
        qc.invalidateQueries({
          queryKey: queryKeys.favorites.all(user.id),
        })
      }
    },
  })

  const toggleFavorite = useCallback(
    (id: string) => {
      if (isFavorite(id)) {
        removeMutation.mutate(id)
      } else {
        addMutation.mutate(id)
      }
    },
    [isFavorite, addMutation, removeMutation]
  )

  return {
    isFavorite,
    toggleFavorite,
    favoriteIds,
    loading: isLoading,
    count: favorites.length,
  }
}
