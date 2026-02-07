import { create } from "zustand"
import { User, Session, AuthError } from "@supabase/supabase-js"
import { supabase, getUserProfile, getUserRoles } from "../services/supabase"
import { Profile, AppRole } from "../types/database"

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  roles: AppRole[]
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

interface AuthActions {
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (
    email: string,
    password: string,
    username?: string
  ) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set, get) => {
  // Track the auth listener subscription so we can clean it up
  let authSubscription: { unsubscribe: () => void } | null = null

  return {
  // State
  user: null,
  session: null,
  profile: null,
  roles: [],
  isLoading: true,
  isInitialized: false,
  error: null,

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true, error: null })

      // Clean up any existing listener before creating a new one
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }

      // Get current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (session?.user) {
        // Fetch profile and roles in parallel
        const [profile, roles] = await Promise.all([
          getUserProfile(session.user.id),
          getUserRoles(session.user.id),
        ])

        set({
          user: session.user,
          session,
          profile,
          roles: roles as AppRole[],
          isLoading: false,
          isInitialized: true,
        })
      } else {
        set({
          user: null,
          session: null,
          profile: null,
          roles: [],
          isLoading: false,
          isInitialized: true,
        })
      }

      // Listen for auth state changes (token refresh, sign-out from another tab, etc.)
      // Skip SIGNED_IN since signIn/signUp already handle profile/role fetching
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === "SIGNED_OUT") {
          set({
            user: null,
            session: null,
            profile: null,
            roles: [],
          })
        } else if (event === "TOKEN_REFRESHED" && newSession) {
          set({ session: newSession, user: newSession.user })
        }
      })
      authSubscription = subscription
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to initialize auth"
      set({ error: message, isLoading: false, isInitialized: true })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      set({ error: error.message, isLoading: false })
      return { error }
    }

    if (data.user) {
      const [profile, roles] = await Promise.all([
        getUserProfile(data.user.id),
        getUserRoles(data.user.id),
      ])

      set({
        user: data.user,
        session: data.session,
        profile,
        roles: roles as AppRole[],
        isLoading: false,
      })
    }

    return { error: null }
  },

  signUp: async (email: string, password: string, username?: string) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })

    if (error) {
      set({ error: error.message, isLoading: false })
      return { error }
    }

    // Note: User may need to verify email before being fully signed in
    if (data.user && data.session) {
      const [profile, roles] = await Promise.all([
        getUserProfile(data.user.id),
        getUserRoles(data.user.id),
      ])

      set({
        user: data.user,
        session: data.session,
        profile,
        roles: roles as AppRole[],
        isLoading: false,
      })
    } else {
      set({ isLoading: false })
    }

    return { error: null }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })

    const { error } = await supabase.auth.signOut()

    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }

    set({
      user: null,
      session: null,
      profile: null,
      roles: [],
      isLoading: false,
    })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return

    const [profile, roles] = await Promise.all([
      getUserProfile(user.id),
      getUserRoles(user.id),
    ])

    set({ profile, roles: roles as AppRole[] })
  },

  clearError: () => set({ error: null }),
}})

// Selector hooks for common use cases
export const useUser = () => useAuthStore((state) => state.user)
export const useSession = () => useAuthStore((state) => state.session)
export const useProfile = () => useAuthStore((state) => state.profile)
export const useRoles = () => useAuthStore((state) => state.roles)
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.session !== null)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
