import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"
import { Database } from "../types/database"

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""

// Check if we're in a browser environment with localStorage
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined"

// Custom storage adapter using expo-secure-store for native and localStorage for web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      if (isBrowser) {
        return window.localStorage.getItem(key)
      }
      return null
    }
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (isBrowser) {
        window.localStorage.setItem(key, value)
      }
      return
    }
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (isBrowser) {
        window.localStorage.removeItem(key)
      }
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Helper function to get the current user
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    console.error("Error getting current user:", error.message)
    return null
  }
  return user
}

// Helper function to get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) {
    console.error("Error getting user profile:", error.message)
    return null
  }
  return data
}

// Helper function to get user roles
export async function getUserRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)

  if (error) {
    console.error("Error getting user roles:", error.message)
    return []
  }
  return (data as Array<{ role: string }> | null)?.map((r) => r.role) ?? []
}
