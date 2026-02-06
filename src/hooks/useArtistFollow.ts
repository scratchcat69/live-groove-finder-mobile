import { useState, useEffect, useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/src/services/supabase"
import { queryKeys } from "@/src/services/queryClient"
import { useUser } from "@/src/stores/authStore"

export function useArtistFollow(artistId: string) {
  const user = useUser()
  const qc = useQueryClient()

  const { data: followRow, isLoading: checkLoading } = useQuery({
    queryKey: ["artist_follow", user?.id, artistId],
    queryFn: async () => {
      if (!user) return null
      const { data } = await (supabase
        .from("artist_follows") as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("artist_id", artistId)
        .maybeSingle()
      return data as { id: string } | null
    },
    enabled: !!user,
  })

  const { data: countData } = useQuery({
    queryKey: ["artist_followers_count", artistId],
    queryFn: async () => {
      const { count } = await (supabase
        .from("artist_follows") as any)
        .select("*", { count: "exact", head: true })
        .eq("artist_id", artistId)
      return (count as number | null) ?? 0
    },
  })

  const [optimisticFollowing, setOptimisticFollowing] = useState<
    boolean | null
  >(null)
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null)

  const isFollowing =
    optimisticFollowing !== null ? optimisticFollowing : !!followRow
  const followersCount =
    optimisticCount !== null ? optimisticCount : (countData ?? 0)

  // Reset optimistic state when real data arrives
  useEffect(() => {
    setOptimisticFollowing(null)
    setOptimisticCount(null)
  }, [followRow, countData])

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated")
      const { error } = await (supabase
        .from("artist_follows") as any)
        .insert({ user_id: user.id, artist_id: artistId })
      if (error) throw new Error(error.message)
    },
    onMutate: () => {
      setOptimisticFollowing(true)
      setOptimisticCount((countData ?? 0) + 1)
    },
    onError: () => {
      setOptimisticFollowing(null)
      setOptimisticCount(null)
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["artist_follow", user?.id, artistId],
      })
      qc.invalidateQueries({
        queryKey: ["artist_followers_count", artistId],
      })
      if (user) {
        qc.invalidateQueries({
          queryKey: queryKeys.artists.following(user.id),
        })
      }
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated")
      const { error } = await (supabase
        .from("artist_follows") as any)
        .delete()
        .eq("user_id", user.id)
        .eq("artist_id", artistId)
      if (error) throw new Error(error.message)
    },
    onMutate: () => {
      setOptimisticFollowing(false)
      setOptimisticCount(Math.max((countData ?? 0) - 1, 0))
    },
    onError: () => {
      setOptimisticFollowing(null)
      setOptimisticCount(null)
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["artist_follow", user?.id, artistId],
      })
      qc.invalidateQueries({
        queryKey: ["artist_followers_count", artistId],
      })
      if (user) {
        qc.invalidateQueries({
          queryKey: queryKeys.artists.following(user.id),
        })
      }
    },
  })

  const toggleFollow = useCallback(() => {
    if (isFollowing) {
      unfollowMutation.mutate()
    } else {
      followMutation.mutate()
    }
  }, [isFollowing, followMutation, unfollowMutation])

  return {
    isFollowing,
    followersCount,
    toggleFollow,
    isLoading:
      checkLoading ||
      followMutation.isPending ||
      unfollowMutation.isPending,
  }
}
