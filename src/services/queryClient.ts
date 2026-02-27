import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time of 5 minutes - data is considered fresh for this duration
      staleTime: 5 * 60 * 1000,
      // Cache time of 30 minutes - unused data is garbage collected after this
      gcTime: 30 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus for mobile
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data is still fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
})

// Query keys factory for consistent key management
export const queryKeys = {
  // User related
  profile: (userId: string) => ["profile", userId] as const,
  userRoles: (userId: string) => ["userRoles", userId] as const,

  // Discoveries
  discoveries: {
    all: ["discoveries"] as const,
    list: (filters?: { userId?: string; limit?: number }) =>
      ["discoveries", "list", filters] as const,
    detail: (id: string) => ["discoveries", "detail", id] as const,
    byUser: (userId: string) => ["discoveries", "byUser", userId] as const,
    recent: (limit?: number) => ["discoveries", "recent", limit] as const,
    nearby: (lat: number, lng: number, timeFilter: string) =>
      ["discoveries", "nearby", lat, lng, timeFilter] as const,
  },

  // Events
  events: {
    all: ["events"] as const,
    nearby: (lat: number, lng: number, radius?: number) =>
      ["events", "nearby", lat, lng, radius] as const,
    detail: (id: string) => ["events", "detail", id] as const,
    ticketmaster: (lat: number, lng: number, radius?: number, keyword?: string) =>
      ["events", "ticketmaster", lat, lng, radius, keyword] as const,
  },

  // Check-ins
  checkins: {
    byUser: (userId: string) => ["checkins", "byUser", userId] as const,
  },

  // Notification preferences
  notificationPreferences: {
    byUser: (userId: string) => ["notificationPreferences", "byUser", userId] as const,
  },

  // Subscription
  subscription: {
    byUser: (userId: string) => ["subscription", "byUser", userId] as const,
  },

  // Recognition usage
  recognitionUsage: {
    byUser: (userId: string) => ["recognitionUsage", "byUser", userId] as const,
  },
}
