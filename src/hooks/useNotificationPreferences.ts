import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"
import { useAuthStore } from "../stores/authStore"

interface NotificationPreferences {
  push_enabled: boolean
  events_nearby: boolean
  artist_performing: boolean
  community_activity: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  events_nearby: true,
  artist_performing: true,
  community_activity: true,
}

export function useNotificationPreferences() {
  const user = useAuthStore((state) => state.user)
  const userId = user?.id
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notificationPreferences.byUser(userId ?? ""),
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .select("push_enabled, events_nearby, artist_performing, community_activity")
        .eq("user_id", userId!)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) return DEFAULT_PREFERENCES

      return {
        push_enabled: data.push_enabled ?? true,
        events_nearby: data.events_nearby ?? true,
        artist_performing: data.artist_performing ?? true,
        community_activity: data.community_activity ?? true,
      }
    },
    enabled: !!userId,
  })

  const mutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!userId) throw new Error("Not authenticated")

      const { error } = await (supabase as any)
        .from("notification_preferences")
        .upsert(
          { user_id: userId, ...updates },
          { onConflict: "user_id" }
        )

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences.byUser(userId ?? ""),
      })
    },
  })

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    mutation.mutate({ [key]: value })
  }

  return {
    preferences: data ?? DEFAULT_PREFERENCES,
    loading: isLoading,
    updatePreference,
    saving: mutation.isPending,
  }
}
