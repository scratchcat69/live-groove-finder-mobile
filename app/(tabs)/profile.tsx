import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  View as RNView,
} from "react-native"
import { useCallback, useRef } from "react"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"

import { Text, View } from "@/components/Themed"
import { useThemeColor } from "@/components/Themed"
import { useAuthStore, useProfile, useRoles } from "@/src/stores/authStore"
import { useDiscoveries, Discovery } from "@/src/hooks/useDiscoveries"
import { useFollowingCount } from "@/src/hooks/useFollowingCount"
import { useFavorites } from "@/src/hooks/useFavorites"
import { useFavoriteArtists, FavoriteArtistInfo } from "@/src/hooks/useFavoriteArtists"

function DiscoveryRow({
  discovery,
  onDelete,
}: {
  discovery: Discovery
  onDelete: (id: string) => void
}) {
  const dateStr = discovery.discovered_at
    ? new Date(discovery.discovered_at).toLocaleDateString()
    : ""

  const handleDelete = () => {
    Alert.alert(
      "Delete Discovery",
      `Delete "${discovery.song_title ?? "Unknown"}" by ${discovery.song_artist ?? "Unknown"}?`,
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
    <View style={styles.discoveryRow}>
      <View style={styles.discoveryIcon}>
        <Text style={styles.discoveryIconText}>🎵</Text>
      </View>
      <View style={styles.discoveryContent}>
        <Text style={styles.discoveryTitle} numberOfLines={1}>
          {discovery.song_title ?? "Unknown Title"}
        </Text>
        <Text style={styles.discoveryArtist} numberOfLines={1}>
          {discovery.song_artist ?? "Unknown Artist"}
        </Text>
      </View>
      <Text style={styles.discoveryDate}>{dateStr}</Text>
      <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

function FavoriteArtistRow({
  artist,
  onPress,
}: {
  artist: FavoriteArtistInfo
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.favoriteRow} onPress={onPress} activeOpacity={0.7}>
      <RNView style={styles.favoriteAvatar}>
        <Text style={styles.favoriteAvatarText}>
          {artist.name[0]?.toUpperCase() ?? "?"}
        </Text>
      </RNView>
      <RNView style={styles.favoriteContent}>
        <Text style={styles.favoriteName} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.genre && artist.genre.length > 0 && (
          <Text style={styles.favoriteGenre} numberOfLines={1}>
            {artist.genre.join(" · ")}
          </Text>
        )}
      </RNView>
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const profile = useProfile()
  const roles = useRoles()
  const { signOut, isLoading } = useAuthStore()
  const { discoveries, totalCount, loading: discoveriesLoading, deleteDiscovery, refresh } = useDiscoveries(50)
  const backgroundColor = useThemeColor({}, "background")
  const router = useRouter()

  const { count: followingCount } = useFollowingCount()
  const { favoriteIds, count: favoritesCount } = useFavorites("artist")
  const { data: favoriteArtists = [] } = useFavoriteArtists(favoriteIds())

  // Refresh discoveries when tab comes back into focus (skip initial mount)
  const hasMounted = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (hasMounted.current) {
        refresh()
      } else {
        hasMounted.current = true
      }
    }, [refresh])
  )

  const handleDeleteDiscovery = async (id: string) => {
    const success = await deleteDiscovery(id)
    if (!success) {
      Alert.alert("Error", "Failed to delete discovery")
    }
  }

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ])
  }

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.username}>
            {profile?.username ?? "Anonymous User"}
          </Text>
          {roles.length > 0 && (
            <View style={styles.rolesContainer}>
              {roles.map((role) => (
                <View key={role} style={styles.roleBadge}>
                  <Text style={styles.roleText}>{role}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{totalCount ?? discoveries.length}</Text>
            <Text style={styles.statLabel}>Discoveries</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Discoveries</Text>
          {discoveriesLoading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : discoveries.length === 0 ? (
            <Text style={styles.emptyText}>
              Songs you discover will appear here
            </Text>
          ) : (
            discoveries.map((discovery) => (
              <DiscoveryRow
                key={discovery.id}
                discovery={discovery}
                onDelete={handleDeleteDiscovery}
              />
            ))
          )}
        </View>

        {favoriteArtists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Artists</Text>
            {favoriteArtists.map((artist) => (
              <FavoriteArtistRow
                key={artist.id}
                artist={artist}
                onPress={() => router.push(`/(tabs)/artists/${artist.id}` as any)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={isLoading}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </RNView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  username: {
    fontSize: 24,
    fontWeight: "600",
  },
  rolesContainer: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  roleBadge: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: "#fff",
    textTransform: "capitalize",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  section: {
    padding: 20,
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
  signOutButton: {
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
    alignItems: "center",
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  discoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  discoveryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  discoveryIconText: {
    fontSize: 18,
  },
  discoveryContent: {
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
  discoveryDate: {
    fontSize: 12,
    opacity: 0.5,
    marginRight: 8,
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
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  favoriteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  favoriteAvatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  favoriteContent: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  favoriteGenre: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 2,
  },
})
