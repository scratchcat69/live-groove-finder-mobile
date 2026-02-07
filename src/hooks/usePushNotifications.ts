import { useState, useEffect, useRef } from "react"
import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { useRouter } from "expo-router"
import { supabase } from "../services/supabase"
import { useAuthStore } from "../stores/authStore"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null)
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    if (!user) return

    // Auto-register if permissions already granted
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status)
      if (status === "granted") {
        registerForPushNotifications()
      }
    })

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Notification received while app is in foreground — handled by notification handler
    })

    // Tap notification listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      if (data?.screen) {
        router.push(data.screen as any)
      }
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [user?.id])

  async function registerForPushNotifications() {
    if (!Device.isDevice) {
      console.warn("Push notifications require a physical device")
      return null
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    setPermissionStatus(finalStatus)

    if (finalStatus !== "granted") {
      return null
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses EAS project ID from app config
    })
    const token = tokenData.data
    setPushToken(token)

    // Save token to database
    if (user) {
      await (supabase as any).from("push_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS,
        },
        { onConflict: "user_id,token" }
      )
    }

    return token
  }

  async function requestPermission() {
    const token = await registerForPushNotifications()
    return token != null
  }

  async function unregisterToken() {
    if (!user || !pushToken) return

    await (supabase as any)
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", pushToken)

    setPushToken(null)
  }

  return {
    pushToken,
    permissionStatus,
    requestPermission,
    unregisterToken,
  }
}
