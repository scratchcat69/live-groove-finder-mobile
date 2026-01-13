import FontAwesome from "@expo/vector-icons/FontAwesome"
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native"
import { QueryClientProvider } from "@tanstack/react-query"
import { useFonts } from "expo-font"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"
import "react-native-reanimated"

import { useColorScheme } from "@/components/useColorScheme"
import { queryClient } from "@/src/services/queryClient"
import { useAuthStore } from "@/src/stores/authStore"

export { ErrorBoundary } from "expo-router"

export const unstable_settings = {
  initialRouteName: "(auth)",
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

function useProtectedRoute() {
  const segments = useSegments()
  const router = useRouter()
  const { session, isInitialized } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) return

    const inAuthGroup = segments[0] === "(auth)"

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace("/(auth)/login")
    } else if (session && inAuthGroup) {
      // Redirect to main app if authenticated and in auth group
      router.replace("/(tabs)")
    }
  }, [session, segments, isInitialized])
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  })

  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  useProtectedRoute()

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  )
}
