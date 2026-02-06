import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/src/services/supabase"

export interface FavoriteArtistInfo {
  id: string
  name: string
  avatar_url: string | null
  genre: string[] | null
}

export function useFavoriteArtists(artistIds: string[]) {
  return useQuery<FavoriteArtistInfo[]>({
    queryKey: ["favorite_artists", artistIds],
    queryFn: async () => {
      if (artistIds.length === 0) return []
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, avatar_url, genre")
        .in("id", artistIds)
      if (error) throw new Error(error.message)
      return (data as FavoriteArtistInfo[]) ?? []
    },
    enabled: artistIds.length > 0,
  })
}
