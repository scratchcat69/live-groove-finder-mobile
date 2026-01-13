import { StyleSheet, FlatList, RefreshControl, View as RNView, TouchableOpacity, Alert } from "react-native"
import { useCallback } from "react"
import { useFocusEffect } from "@react-navigation/native"

import { Text, View, useThemeColor } from "@/components/Themed"
import { usePublicDiscoveries, PublicDiscovery } from "@/src/hooks/usePublicDiscoveries"
import { useAuthStore } from "@/src/stores/authStore"
import { supabase } from "@/src/services/supabase"

function getTimeAgo(dateString: string): string {
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

function DiscoveryCard({
  discovery,
  currentUserId,
  onDelete,
}: {
  discovery: PublicDiscovery
  currentUserId?: string
  onDelete: (id: string) => void
}) {
  const timeAgo = getTimeAgo(discovery.discovered_at)
  const matchType = discovery.song_metadata?.matchType === "melody" ? "Humming" : "Audio"
  const isOwner = currentUserId === discovery.discovered_by_user_id

  const handleDelete = () => {
    Alert.alert(
      "Delete Discovery",
      `Delete "${discovery.song_title}" by ${discovery.song_artist}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(discovery.id),
        },
      ]
    )
  }

  return (
    <View style={styles.card}>
      <RNView style={styles.cardHeader}>
        <RNView style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{matchType}</Text>
        </RNView>
        <RNView style={styles.headerRight}>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
          {isOwner && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </RNView>
      </RNView>

      <RNView style={styles.songInfo}>
        <RNView style={styles.albumArt}>
          <Text style={styles.albumArtText}>🎵</Text>
        </RNView>
        <RNView style={styles.songDetails}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {discovery.song_title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {discovery.song_artist}
          </Text>
          {discovery.song_metadata?.album && (
            <Text style={styles.songAlbum} numberOfLines={1}>
              {discovery.song_metadata.album}
            </Text>
          )}
        </RNView>
      </RNView>

      {discovery.location && (
        <Text style={styles.location}>📍 {discovery.location}</Text>
      )}
    </View>
  )
}

export default function FeedScreen() {
  const { discoveries, loading, refresh } = usePublicDiscoveries(50)
  const backgroundColor = useThemeColor({}, "background")
  const user = useAuthStore((state) => state.user)

  // Refresh when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const handleDeleteDiscovery = async (id: string) => {
    try {
      const { error } = await supabase
        .from("discoveries")
        .delete()
        .eq("id", id)

      if (error) {
        Alert.alert("Error", "Failed to delete discovery")
        return
      }

      // Refresh the list
      refresh()
    } catch {
      Alert.alert("Error", "Failed to delete discovery")
    }
  }

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      <FlatList
        data={discoveries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DiscoveryCard
            discovery={item}
            currentUserId={user?.id}
            onDelete={handleDeleteDiscovery}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌍</Text>
              <Text style={styles.emptyTitle}>No Discoveries Yet</Text>
              <Text style={styles.emptyText}>
                Music discovered by the community will appear here
              </Text>
            </View>
          )
        }
      />
    </RNView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  matchBadge: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  matchBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  timeAgo: {
    fontSize: 12,
    opacity: 0.5,
  },
  songInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  albumArtText: {
    fontSize: 24,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  songArtist: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  songAlbum: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 20,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
})
