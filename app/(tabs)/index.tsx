import { StyleSheet, ActionSheetIOS, Alert, Linking, Platform, ScrollView, Share, TouchableOpacity } from "react-native"
import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"

import { Text, View } from "@/components/Themed"
import { RecognitionButton } from "@/src/components/recognition/RecognitionButton"
import {
  RecognitionResult,
  NotFoundResult,
} from "@/src/components/recognition/RecognitionResult"
import { useAudioRecording } from "@/src/hooks/useAudioRecording"
import { useMusicRecognition } from "@/src/hooks/useMusicRecognition"
import { useDiscoveries, Discovery } from "@/src/hooks/useDiscoveries"
import { useLocation } from "@/src/hooks/useLocation"
import { useRecognitionUsage } from "@/src/hooks/useRecognitionUsage"
import { useSubscription } from "@/src/hooks/useSubscription"
import { PaywallModal } from "@/src/components/subscription/PaywallModal"
import { UsageBadge } from "@/src/components/subscription/UsageBadge"
import { queryKeys } from "@/src/services/queryClient"
import { useAuthStore } from "@/src/stores/authStore"

function DiscoveryItem({
  discovery,
  onDelete,
}: {
  discovery: Discovery
  onDelete: (id: string) => void
}) {
  const timeAgo = getTimeAgo(discovery.discovered_at)
  const title = discovery.song_title ?? "Unknown Title"
  const artist = discovery.song_artist ?? "Unknown Artist"
  const spotifyUrl = discovery.song_metadata?.spotifyUrl ?? ""

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I discovered "${title}" by ${artist} on Live Groove Finder!${spotifyUrl ? `\nListen: ${spotifyUrl}` : ""}`,
      })
    } catch {
      // User cancelled share
    }
  }

  const handleOpenSpotify = () => {
    if (spotifyUrl) {
      Linking.openURL(spotifyUrl)
    }
  }

  const handlePress = () => {
    const options: string[] = []
    const actions: (() => void)[] = []

    if (spotifyUrl) {
      options.push("Listen on Spotify")
      actions.push(handleOpenSpotify)
    }
    options.push("Share")
    actions.push(handleShare)
    options.push("Delete")
    actions.push(() => onDelete(discovery.id))
    options.push("Cancel")

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: options.indexOf("Delete"),
          cancelButtonIndex: options.length - 1,
          title: `${title}\n${artist}`,
        },
        (buttonIndex) => {
          if (buttonIndex !== options.length - 1) {
            actions[buttonIndex]()
          }
        }
      )
    } else {
      // Android fallback using Alert
      const buttons: { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }[] =
        actions.slice(0, -1).map((action, i) => ({
          text: options[i],
          style: (options[i] === "Delete" ? "destructive" : "default") as "default" | "destructive",
          onPress: action,
        }))
      buttons.push({ text: "Cancel", style: "cancel" })
      Alert.alert(title, artist, buttons)
    }
  }

  return (
    <TouchableOpacity style={styles.discoveryItem} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.discoveryIcon}>
        <Text style={styles.discoveryIconText}>🎵</Text>
      </View>
      <View style={styles.discoveryInfo}>
        <Text style={styles.discoveryTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.discoveryArtist} numberOfLines={1}>
          {artist}
        </Text>
        <Text style={styles.discoveryTime}>{timeAgo}</Text>
      </View>
      <Text style={styles.discoveryChevron}>›</Text>
    </TouchableOpacity>
  )
}

function getTimeAgo(dateString: string | null): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function DiscoverScreen() {
  const {
    recognize,
    status: recognitionStatus,
    result,
    reset: resetRecognition,
  } = useMusicRecognition()

  const { location } = useLocation()
  const { count: usageCount, limit: usageLimit, canRecognize } = useRecognitionUsage()
  const { isPremium } = useSubscription()
  const [showPaywall, setShowPaywall] = useState(false)
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  // Build location data for recognition (attaches to saved discoveries)
  const getLocationData = useCallback(() => {
    if (!location) return undefined
    return {
      name: location.city
        ? `${location.city}${location.region ? `, ${location.region}` : ""}`
        : undefined,
      latitude: location.latitude,
      longitude: location.longitude,
    }
  }, [location])

  // Handle auto-stop: when recording reaches max duration, automatically recognize
  const handleAutoStop = useCallback(
    async (audioBase64: string) => {
      await recognize(audioBase64, getLocationData())
    },
    [recognize, getLocationData]
  )

  const {
    status: recordingStatus,
    duration,
    metering,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recordingError,
  } = useAudioRecording({ onAutoStop: handleAutoStop })

  const { discoveries, loading: discoveriesLoading, refresh: refreshDiscoveries, deleteDiscovery } = useDiscoveries(5)

  const handleDeleteDiscovery = useCallback(async (id: string) => {
    const success = await deleteDiscovery(id)
    if (!success) {
      Alert.alert("Error", "Failed to delete discovery")
    }
  }, [deleteDiscovery])

  // Refresh discoveries and usage count when a song is successfully recognized
  useEffect(() => {
    if (recognitionStatus === "success") {
      refreshDiscoveries()
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.recognitionUsage.byUser(user.id) })
      }
    }
  }, [recognitionStatus, refreshDiscoveries, queryClient, user?.id])

  const isListening = recordingStatus === "recording"
  const isProcessing =
    recordingStatus === "processing" || recognitionStatus === "recognizing"

  const handlePress = useCallback(async () => {
    if (recordingError) {
      Alert.alert("Recording Error", recordingError)
      return
    }

    if (isListening) {
      // Stop recording and recognize
      const audioBase64 = await stopRecording()
      if (audioBase64) {
        await recognize(audioBase64, getLocationData())
      }
    } else if (!isProcessing) {
      // Check recognition limit before starting
      if (!canRecognize) {
        setShowPaywall(true)
        return
      }
      // Start recording
      resetRecognition()
      await startRecording()
    }
  }, [
    isListening,
    isProcessing,
    recordingError,
    canRecognize,
    startRecording,
    stopRecording,
    recognize,
    resetRecognition,
    getLocationData,
  ])

  const handleDismiss = useCallback(() => {
    resetRecognition()
    cancelRecording()
  }, [resetRecognition, cancelRecording])

  const router = useRouter()
  const handleUpgrade = useCallback(() => {
    setShowPaywall(false)
    router.push("/(tabs)/profile/subscription" as any)
  }, [router])

  const getStatusText = () => {
    if (isProcessing) return "Identifying..."
    if (isListening) return "Listening... Tap to stop"
    return "Tap to identify music"
  }

  const getSubtitle = () => {
    return "Works with recorded music, live performances, and humming"
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Discover Music</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>

        <UsageBadge
          count={usageCount}
          limit={usageLimit}
          isPremium={isPremium}
          onPress={() => setShowPaywall(true)}
        />

        <RecognitionButton
          onPress={handlePress}
          isListening={isListening}
          isProcessing={isProcessing}
          metering={metering}
          duration={duration}
        />

        <Text style={styles.hint}>{getStatusText()}</Text>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Discoveries</Text>
        {discoveriesLoading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : discoveries.length === 0 ? (
          <Text style={styles.emptyText}>
            Your recent discoveries will appear here
          </Text>
        ) : (
          <ScrollView style={styles.discoveryList} showsVerticalScrollIndicator={false}>
            {discoveries.map((discovery) => (
              <DiscoveryItem
                key={discovery.id}
                discovery={discovery}
                onDelete={handleDeleteDiscovery}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recognition Result Overlay */}
      {recognitionStatus === "success" && result?.song && (
        <RecognitionResult song={result.song} onDismiss={handleDismiss} />
      )}

      {recognitionStatus === "not_found" && (
        <NotFoundResult onDismiss={handleDismiss} />
      )}

      {recognitionStatus === "error" && (
        <NotFoundResult onDismiss={handleDismiss} />
      )}

      <PaywallModal
        visible={showPaywall}
        usageCount={usageCount}
        usageLimit={usageLimit}
        onUpgrade={handleUpgrade}
        onDismiss={() => setShowPaywall(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  hint: {
    marginTop: 20,
    fontSize: 14,
    opacity: 0.5,
  },
  recentSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyText: {
    opacity: 0.5,
    textAlign: "center",
    paddingVertical: 20,
  },
  discoveryList: {
    maxHeight: 300,
  },
  discoveryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  discoveryIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  discoveryIconText: {
    fontSize: 20,
  },
  discoveryInfo: {
    flex: 1,
  },
  discoveryTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  discoveryArtist: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  discoveryTime: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 4,
  },
  discoveryChevron: {
    fontSize: 22,
    color: "#666",
    fontWeight: "300",
    marginLeft: 8,
  },
})
