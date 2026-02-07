import React from "react"
import { StyleSheet, TouchableOpacity, Linking, Share, View as RNView } from "react-native"
import { Text, View } from "@/components/Themed"
import { RecognizedSong } from "@/src/hooks/useMusicRecognition"
import { enrichSpotifyUrl } from "@/src/utils/affiliateLinks"

interface RecognitionResultProps {
  song: RecognizedSong
  onDismiss: () => void
  onSave?: () => void
}

export function RecognitionResult({ song, onDismiss, onSave }: RecognitionResultProps) {
  const openSpotify = () => {
    if (song.spotifyUrl) {
      Linking.openURL(enrichSpotifyUrl(song.spotifyUrl))
    }
  }

  const handleShare = async () => {
    try {
      const listenUrl = song.spotifyUrl ? enrichSpotifyUrl(song.spotifyUrl) : ""
      await Share.share({
        message: `I discovered "${song.title}" by ${song.artist} on Live Groove Finder!${listenUrl ? `\nListen: ${listenUrl}` : ""}`,
      })
    } catch {
      // User cancelled share
    }
  }

  const confidencePercent = Math.round(song.confidence)
  const matchLabel = song.matchType === "melody" ? "Melody Match" : "Exact Match"

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Match type badge */}
        <RNView style={[styles.badge, song.matchType === "melody" && styles.badgeMelody]}>
          <Text style={styles.badgeText}>{matchLabel}</Text>
        </RNView>

        {/* Song info */}
        <Text style={styles.title}>{song.title}</Text>
        <Text style={styles.artist}>{song.artist}</Text>

        {song.album && <Text style={styles.album}>{song.album}</Text>}

        {song.releaseDate && (
          <Text style={styles.releaseDate}>Released: {song.releaseDate}</Text>
        )}

        {/* Confidence meter */}
        <RNView style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence</Text>
          <RNView style={styles.confidenceBar}>
            <RNView
              style={[
                styles.confidenceFill,
                { width: `${confidencePercent}%` },
                confidencePercent > 80 && styles.confidenceHigh,
                confidencePercent > 50 && confidencePercent <= 80 && styles.confidenceMedium,
                confidencePercent <= 50 && styles.confidenceLow,
              ]}
            />
          </RNView>
          <Text style={styles.confidencePercent}>{confidencePercent}%</Text>
        </RNView>

        {/* Action buttons */}
        <RNView style={styles.actions}>
          {song.spotifyUrl && (
            <TouchableOpacity style={styles.spotifyButton} onPress={openSpotify}>
              <Text style={styles.spotifyButtonText}>Open in Spotify</Text>
            </TouchableOpacity>
          )}

          {onSave && (
            <TouchableOpacity style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </RNView>

        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

interface NotFoundResultProps {
  onDismiss: () => void
}

export function NotFoundResult({ onDismiss }: NotFoundResultProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.notFoundIcon}>🎵</Text>
        <Text style={styles.notFoundTitle}>No Match Found</Text>
        <Text style={styles.notFoundText}>
          We couldn't identify this song. Try recording in a quieter environment or get
          closer to the audio source.
        </Text>

        <RNView style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips for better recognition:</Text>
          <Text style={styles.tipItem}>• Hold your phone closer to the speaker</Text>
          <Text style={styles.tipItem}>• Reduce background noise</Text>
          <Text style={styles.tipItem}>• Record for at least 5 seconds</Text>
          <Text style={styles.tipItem}>• For humming, sing clearly and on-pitch</Text>
        </RNView>

        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeMelody: {
    backgroundColor: "#f59e0b",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  artist: {
    fontSize: 18,
    opacity: 0.8,
    textAlign: "center",
    marginBottom: 8,
  },
  album: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 4,
  },
  releaseDate: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: "center",
    marginBottom: 16,
  },
  confidenceContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    opacity: 0.6,
    width: 70,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 4,
  },
  confidenceHigh: {
    backgroundColor: "#22c55e",
  },
  confidenceMedium: {
    backgroundColor: "#f59e0b",
  },
  confidenceLow: {
    backgroundColor: "#ef4444",
  },
  confidencePercent: {
    fontSize: 12,
    fontWeight: "600",
    width: 40,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  spotifyButton: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  spotifyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  shareButton: {
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: "#6366f1",
    fontSize: 16,
  },
  notFoundIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  tips: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
})
