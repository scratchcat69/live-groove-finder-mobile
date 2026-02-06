import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/src/services/supabase"
import { queryKeys } from "@/src/services/queryClient"

export interface NearbyArtist {
  id: string
  name: string
  genre: string[]
  bio: string
  avatar_url: string
  latitude: number
  longitude: number
  location: string
  distance_km: number
}

interface UseNearbyArtistsParams {
  latitude: number
  longitude: number
  radiusKm?: number
  genres?: string[]
  searchQuery?: string
  enabled?: boolean
}

export function useNearbyArtists({
  latitude,
  longitude,
  radiusKm = 50,
  genres,
  searchQuery,
  enabled = true,
}: UseNearbyArtistsParams) {
  return useQuery<NearbyArtist[]>({
    queryKey: [
      ...queryKeys.artists.nearby(latitude, longitude, radiusKm),
      genres,
      searchQuery,
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        user_lat: latitude,
        user_lng: longitude,
        radius_km: radiusKm,
      }
      if (genres && genres.length > 0) params.genres = genres
      if (searchQuery) params.search_query = searchQuery

      const { data, error } = await supabase.rpc(
        "get_nearby_artists",
        params as any
      )

      if (error) throw new Error(error.message)
      return (data as NearbyArtist[]) ?? []
    },
    enabled: enabled && latitude !== 0 && longitude !== 0,
  })
}
