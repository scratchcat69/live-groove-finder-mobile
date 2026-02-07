import { useQuery } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"

export interface NearbyVenue {
  id: string
  name: string
  description: string | null
  type: string | null
  location: string | null
  latitude: number
  longitude: number
  capacity: number | null
  distance_km: number
}

interface UseNearbyVenuesParams {
  latitude: number
  longitude: number
  radiusKm?: number
  enabled?: boolean
}

export function useNearbyVenues({
  latitude,
  longitude,
  radiusKm = 50,
  enabled = true,
}: UseNearbyVenuesParams) {
  return useQuery<NearbyVenue[]>({
    queryKey: queryKeys.venues.nearby(latitude, longitude, radiusKm),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_nearby_venues", {
        user_lat: latitude,
        user_lng: longitude,
        radius_km: radiusKm,
      } as any)

      if (error) throw new Error(error.message)
      return (data as NearbyVenue[]) ?? []
    },
    enabled: enabled && latitude !== 0 && longitude !== 0,
  })
}
