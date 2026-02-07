import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  View,
  Image,
} from "react-native"
import { useCallback, useRef } from "react"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter, Stack } from "expo-router"
import FontAwesome from "@expo/vector-icons/FontAwesome"

import { Text } from "@/components/Themed"
import { useThemeColor } from "@/components/Themed"
import { useProfile, useRoles } from "@/src/stores/authStore"
import { useDiscoveries, Discovery } from "@/src/hooks/useDiscoveries"
import { useFollowingCount } from "@/src/hooks/useFollowingCount"
import { useFavorites } from "@/src/hooks/useFavorites"
import { useFavoriteArtists, FavoriteArtistInfo } from "@/src/hooks/useFavoriteArtists"
import { useCheckins, CheckinRow } from "@/src/hooks/useCheckins"
import { useSubscription } from "@/src/hooks/useSubscription"
import { useRecognitionUsage } from "@/src/hooks/useRecognitionUsage"

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
      <View style={styles.favoriteAvatar}>
        <Text style={styles.favoriteAvatarText}>
          {artist.name[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
      <View style={styles.favoriteContent}>
        <Text style={styles.favoriteName} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.genre && artist.genre.length > 0 && (
          <Text style={styles.favoriteGenre} numberOfLines={1}>
            {artist.genre.join(" · ")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

function CheckinRowItem({ checkin }: { checkin: CheckinRow }) {
  const eventName = checkin.events?.name ?? "Unknown Event"
  const venue = checkin.events?.venues
  const venueText = venue ? `${venue.name}, ${venue.location}` : ""
  const stars = checkin.rating ? "\u2605".repeat(checkin.rating) + "\u2606".repeat(5 - checkin.rating) : ""
  const dateText = checkin.checked_in_at ? new Date(checkin.checked_in_at).toLocaleDateString() : ""

  return (
    <View style={styles.discoveryRow}>
      <View style={[styles.discoveryIcon, { backgroundColor: "#22c55e" }]}>
        <Text style={styles.discoveryIconText}>{"\u2713"}</Text>
      </View>
      <View style={styles.discoveryContent}>
        <Text style={styles.discoveryTitle} numberOfLines={1}>{eventName}</Text>
        {venueText ? <Text style={styles.discoveryArtist} numberOfLines={1}>{"\uD83D\uDCCD"} {venueText}</Text> : null}
        {stars ? <Text style={{ fontSize: 13, color: "#f59e0b" }}>{stars}</Text> : null}
        {checkin.review ? <Text style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }} numberOfLines={1}>"{checkin.review}"</Text> : null}
      </View>
      <Text style={styles.discoveryDate}>{dateText}</Text>
    </View>
  )
}

export default function ProfileScreen() {
  const profile = useProfile()
  const roles = useRoles()
  const { discoveries, totalCount, loading: discoveriesLoading, deleteDiscovery, refresh } = useDiscoveries(50)
  const backgroundColor = useThemeColor({}, "background")
  const router = useRouter()

  const { tier, isPremium } = useSubscription()
  const { count: usageCount, limit: usageLimit } = useRecognitionUsage()
  const { count: followingCount } = useFollowingCount()
  const { favoriteIds, count: favoritesCount } = useFavorites("artist")
  const { data: favoriteArtists = [] } = useFavoriteArtists(favoriteIds())
  const { checkins, count: checkinCount } = useCheckins()

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

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile/settings" as any)}
              style={{ marginRight: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome name="cog" size={22} color="#aaa" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
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
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push("/(tabs)/profile/edit" as any)}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
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
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{checkinCount}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
        </View>

        {/* Subscription */}
        <TouchableOpacity
          style={styles.subscriptionBanner}
          onPress={() => router.push("/(tabs)/profile/subscription" as any)}
          activeOpacity={0.7}
        >
          <View style={styles.subscriptionInfo}>
            <View style={[styles.subscriptionBadge, isPremium && styles.subscriptionBadgePremium]}>
              <Text style={[styles.subscriptionBadgeText, isPremium && styles.subscriptionBadgeTextPremium]}>
                {isPremium ? "Premium" : "Free Plan"}
              </Text>
            </View>
            <Text style={styles.subscriptionUsage}>
              {isPremium
                ? `${usageCount} recognitions this month`
                : `${usageCount}/${usageLimit} recognitions this month`}
            </Text>
          </View>
          {!isPremium && (
            <Text style={styles.upgradeText}>Upgrade</Text>
          )}
        </TouchableOpacity>

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

        {/* Concert History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Concert History ({checkinCount})</Text>
          {checkins.length > 0 ? (
            checkins.map((checkin) => (
              <CheckinRowItem key={checkin.id} checkin={checkin} />
            ))
          ) : (
            <Text style={styles.emptyText}>Your concert check-ins will appear here</Text>
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
      </ScrollView>
    </View>
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    color: "#fff",
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
  editProfileButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  editProfileButtonText: {
    color: "#6366f1",
    fontSize: 14,
    fontWeight: "600",
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
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  subscriptionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  subscriptionInfo: {
    flex: 1,
    backgroundColor: "transparent",
  },
  subscriptionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#333",
    marginBottom: 4,
  },
  subscriptionBadgePremium: {
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#aaa",
  },
  subscriptionBadgeTextPremium: {
    color: "#6366f1",
  },
  subscriptionUsage: {
    fontSize: 13,
    color: "#888",
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366f1",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    paddingVertical: 20,
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
    color: "#fff",
  },
  discoveryArtist: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 2,
  },
  discoveryDate: {
    fontSize: 12,
    color: "#888",
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
