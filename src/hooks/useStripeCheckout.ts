import { useCallback, useEffect, useRef } from "react"
import { AppState, Linking } from "react-native"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "../stores/authStore"
import { queryKeys } from "../services/queryClient"
import { supabase } from "../services/supabase"

export function useStripeCheckout() {
  const refreshSubscription = useAuthStore((state) => state.refreshSubscription)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const appStateRef = useRef(AppState.currentState)

  // Auto-refresh subscription when app returns to foreground (e.g. after Stripe checkout)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
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
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          successUrl: "livegroovefinder://subscription?success=true",
          cancelUrl: "livegroovefinder://subscription?canceled=true",
        },
      })
      if (error) throw new Error(error.message || "Checkout failed")
      return data.url as string
    },
  })

  const portalMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: "livegroovefinder://subscription",
        },
      })
      if (error) throw new Error(error.message || "Portal failed")
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
