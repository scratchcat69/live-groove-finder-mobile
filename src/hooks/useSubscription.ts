import { useQuery } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"
import { useAuthStore } from "../stores/authStore"
import { Subscription, SubscriptionTier } from "../types/database"

interface UseSubscriptionReturn {
  subscription: Subscription | null
  tier: SubscriptionTier
  isActive: boolean
  isPremium: boolean
  loading: boolean
}

export function useSubscription(): UseSubscriptionReturn {
  const user = useAuthStore((state) => state.user)
  const userId = user?.id

  const { data, isLoading } = useQuery<Subscription | null>({
    queryKey: queryKeys.subscription.byUser(userId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId!)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null // No row found
        throw new Error(error.message)
      }
      return data as Subscription
    },
    enabled: !!userId,
  })

  const tier: SubscriptionTier = data?.tier ?? "free"
  const isActive = data?.status === "active" || data?.status === "trial"

  return {
    subscription: data ?? null,
    tier,
    isActive,
    isPremium: tier === "premium" && isActive,
    loading: isLoading,
  }
}
