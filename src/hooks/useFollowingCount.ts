import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/src/services/supabase"
import { queryKeys } from "@/src/services/queryClient"
import { useUser } from "@/src/stores/authStore"

export interface FollowedArtist {
  id: string
  name: string
  avatar_url: string | null
}

export function useFollowingCount() {
  const user = useUser()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.artists.following(user?.id ?? ""),
    queryFn: async () => {
      if (!user) return { count: 0, artists: [] as FollowedArtist[] }

      // Get followed artist IDs
      const { data: follows, error: followsError } = await (supabase
        .from("artist_follows") as any)
        .select("artist_id")
        .eq("user_id", user.id)
        .order("followed_at", { ascending: false })

      if (followsError) throw new Error(followsError.message)
      const followRows = follows as { artist_id: string }[] | null
      if (!followRows || followRows.length === 0) {
        return { count: 0, artists: [] as FollowedArtist[] }
      }

      const artistIds = followRows.map((f) => f.artist_id)

      // Fetch artist details
      const { data: artistData, error: artistError } = await (supabase
        .from("artists") as any)
        .select("id, name, avatar_url")
        .in("id", artistIds)

      if (artistError) throw new Error(artistError.message)

      const artists: FollowedArtist[] =
        ((artistData as FollowedArtist[]) ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          avatar_url: a.avatar_url,
        }))

      return { count: artists.length, artists }
    },
    enabled: !!user,
  })

  return {
    count: data?.count ?? 0,
    artists: data?.artists ?? [],
    isLoading,
  }
}
