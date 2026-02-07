import { useQuery } from "@tanstack/react-query"
import { supabase } from "../services/supabase"
import { queryKeys } from "../services/queryClient"
import { useAuthStore } from "../stores/authStore"
import { useSubscription } from "./useSubscription"
import { RECOGNITION_LIMITS } from "../constants/subscription"

interface UseRecognitionUsageReturn {
  count: number
  limit: number
  remaining: number
  canRecognize: boolean
  loading: boolean
}

export function useRecognitionUsage(): UseRecognitionUsageReturn {
  const user = useAuthStore((state) => state.user)
  const userId = user?.id
  const { tier, loading: subLoading } = useSubscription()

  const { data: count, isLoading } = useQuery({
    queryKey: queryKeys.recognitionUsage.byUser(userId ?? ""),
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_recognition_count_this_month", {
        p_user_id: userId!,
      })

      if (error) throw new Error(error.message)
      return (data as number) ?? 0
    },
    enabled: !!userId,
  })

  const usage = count ?? 0
  const limit = RECOGNITION_LIMITS[tier] ?? 5
  const remaining = Math.max(0, limit - usage)

  return {
    count: usage,
    limit,
    remaining,
    canRecognize: usage < limit,
    loading: isLoading || subLoading,
  }
}
