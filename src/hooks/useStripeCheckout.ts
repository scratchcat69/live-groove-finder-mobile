import { useCallback, useEffect, useRef } from "react"
import { AppState, Linking } from "react-native"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "../stores/authStore"
import { queryKeys } from "../services/queryClient"
import { SUPABASE_URL } from "../services/supabase"

const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""

async function callEdgeFunction(functionName: string, body: Record<string, unknown>, accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${functionName} failed: ${response.status} - ${text}`)
  }
  return response.json()
}

export function useStripeCheckout() {
  const session = useAuthStore((state) => state.session)
  const refreshSubscription = useAuthStore((state) => state.refreshSubscription)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const appStateRef = useRef(AppState.currentState)

  // Auto-refresh subscription when app returns to foreground (e.g. after Stripe checkout)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        // App came back to foreground — refresh subscription data
        refreshSubscription()
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.subscription.byUser(user.id) })
          queryClient.invalidateQueries({ queryKey: queryKeys.recognitionUsage.byUser(user.id) })
        }
      }
      appStateRef.current = nextState
    })
    return () => subscription.remove()
  }, [refreshSubscription, queryClient, user?.id])

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error("Not authenticated")
      const data = await callEdgeFunction("create-checkout-session", {
        successUrl: "livegroovefinder://subscription?success=true",
        cancelUrl: "livegroovefinder://subscription?canceled=true",
      }, session.access_token)
      return data.url as string
    },
  })

  const portalMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error("Not authenticated")
      const data = await callEdgeFunction("create-portal-session", {
        returnUrl: "livegroovefinder://subscription",
      }, session.access_token)
      return data.url as string
    },
  })

  const checkout = useCallback(async () => {
    const url = await checkoutMutation.mutateAsync()
    if (url) await Linking.openURL(url)
  }, [checkoutMutation])

  const manageSubscription = useCallback(async () => {
    const url = await portalMutation.mutateAsync()
    if (url) await Linking.openURL(url)
  }, [portalMutation])

  return {
    checkout,
    manageSubscription,
    isLoading: checkoutMutation.isPending || portalMutation.isPending,
    error: checkoutMutation.error?.message || portalMutation.error?.message || null,
  }
}
