import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"
import { useAuthStore } from "../stores/authStore"

export interface CheckinRow {
  id: string
  event_id: string
  artist_id: string | null
  venue_id: string | null
  rating: number | null
  review: string | null
  checked_in_at: string | null
  events?: {
    name: string
    event_date: string
    venues?: { name: string; location: string } | null
  } | null
}

interface CreateCheckinParams {
  eventName: string
  eventDate: string
  eventDescription?: string
  rating: number
  review?: string
}

interface UseCheckinsReturn {
  checkins: CheckinRow[]
  count: number
  loading: boolean
  createCheckin: (params: CreateCheckinParams) => Promise<boolean>
  isCheckedIn: (eventName: string, eventDate: string) => boolean
}

export function useCheckins(): UseCheckinsReturn {
  const user = useAuthStore((state) => state.user)
  const qc = useQueryClient()
  const userId = user?.id

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.checkins.byUser(userId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concert_checkins")
        .select("*, events(name, event_date, venues(name, location))")
        .eq("user_id", userId!)
        .order("checked_in_at", { ascending: false })

      if (error) throw new Error(error.message)
      return (data as unknown as CheckinRow[]) ?? []
    },
    enabled: !!userId,
  })

  const createMutation = useMutation({
    mutationFn: async (params: CreateCheckinParams) => {
      if (!userId) throw new Error("Not authenticated")

      // Bridge: find or create a local event from Ticketmaster data
      const eventId = await findOrCreateLocalEvent(
        params.eventName,
        params.eventDate,
        params.eventDescription
      )

      const { error } = await supabase.from("concert_checkins").insert({
        user_id: userId,
        event_id: eventId,
        rating: params.rating,
        review: params.review || null,
      } as any)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checkins.byUser(userId ?? "") })
    },
  })

  const createCheckin = async (params: CreateCheckinParams): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(params)
      return true
    } catch {
      return false
    }
  }

  const isCheckedIn = (eventName: string, eventDate: string): boolean => {
    if (!data) return false
    return data.some(
      (c) =>
        c.events?.name === eventName &&
        c.events?.event_date === eventDate
    )
  }

  return {
    checkins: data ?? [],
    count: data?.length ?? 0,
    loading: isLoading,
    createCheckin,
    isCheckedIn,
  }
}

/**
 * Bridge: find an existing local event by name+date, or create one from Ticketmaster data.
 * Returns the local event's UUID.
 */
async function findOrCreateLocalEvent(
  name: string,
  eventDate: string,
  description?: string
): Promise<string> {
  // Normalize date to YYYY-MM-DD for matching
  const dateOnly = eventDate.split("T")[0]

  // Try to find existing
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("name", name)
    .eq("event_date", dateOnly)
    .limit(1)
    .maybeSingle()

  if (existing) return (existing as { id: string }).id

  // Create new local event
  const { data: created, error } = await supabase
    .from("events")
    .insert({ name, event_date: dateOnly, description: description || null } as any)
    .select("id")
    .single()

  if (error) throw new Error(`Failed to create event: ${error.message}`)
  return (created as { id: string }).id
}
