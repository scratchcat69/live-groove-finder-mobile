import {
  StyleSheet,
  ScrollView,
  View as RNView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { Text, useThemeColor } from "@/components/Themed"
import { supabase } from "@/src/services/supabase"
import { queryKeys } from "@/src/services/queryClient"
import { useArtistFollow } from "@/src/hooks/useArtistFollow"
import { useFavorites } from "@/src/hooks/useFavorites"
import type { Artist } from "@/src/types/database"

export default function ArtistProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const backgroundColor = useThemeColor({}, "background")

  const {
    data: artist,
    isLoading,
    error,
  } = useQuery<Artist | null>({
    queryKey: queryKeys.artists.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", id!)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!id,
  })

  const { isFollowing, followersCount, toggleFollow, isLoading: followLoading } =
    useArtistFollow(id!)
  const { isFavorite, toggleFavorite } = useFavorites("artist")

  if (isLoading) {
    return (
      <RNView
        style={[styles.container, styles.centerContent, { backgroundColor }]}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </RNView>
    )
  }

  if (error || !artist) {
    return (
      <RNView
        style={[styles.container, styles.centerContent, { backgroundColor }]}
      >
        <Text style={styles.errorText}>Artist not found</Text>
      </RNView>
    )
  }

  const hasSocialLinks =
    artist.instagram_url || artist.spotify_url || artist.merch_url
  const hasBookingInfo =
    artist.booking_price_min != null ||
    artist.booking_price_max != null ||
    artist.contact_email ||
    artist.availability_notes

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner area */}
        <RNView style={styles.banner}>
          <RNView style={styles.bannerOverlay} />
        </RNView>

        {/* Avatar & Name */}
        <RNView style={styles.profileHeader}>
          <RNView style={styles.avatar}>
            <Text style={styles.avatarText}>
              {artist.name[0]?.toUpperCase() ?? "?"}
            </Text>
          </RNView>
          <Text style={styles.name}>{artist.name}</Text>
          {artist.location && (
            <Text style={styles.location}>📍 {artist.location}</Text>
          )}
          <Text style={styles.followersText}>
            {followersCount} {followersCount === 1 ? "follower" : "followers"}
          </Text>
        </RNView>

        {/* Action Buttons */}
        <RNView style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followButtonActive,
            ]}
            onPress={toggleFollow}
            disabled={followLoading}
          >
            <Text
              style={[
                styles.followButtonText,
                isFollowing && styles.followButtonTextActive,
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(artist.id)}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite(artist.id) ? "❤️" : "🤍"}
            </Text>
          </TouchableOpacity>
        </RNView>

        {/* Genres */}
        {artist.genre && artist.genre.length > 0 && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <RNView style={styles.genreRow}>
              {artist.genre.map((g) => (
                <RNView key={g} style={styles.genreBadge}>
                  <Text style={styles.genreText}>{g}</Text>
                </RNView>
              ))}
            </RNView>
          </RNView>
        )}

        {/* Bio */}
        {artist.bio && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{artist.bio}</Text>
          </RNView>
        )}

        {/* Booking Info */}
        {hasBookingInfo && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Booking</Text>
            {(artist.booking_price_min != null ||
              artist.booking_price_max != null) && (
              <Text style={styles.infoText}>
                💰 $
                {artist.booking_price_min ?? "?"}
                {artist.booking_price_max
                  ? ` - $${artist.booking_price_max}`
                  : "+"}
              </Text>
            )}
            {artist.contact_email && (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`mailto:${artist.contact_email}`)
                }
              >
                <Text style={styles.linkText}>
                  ✉️ {artist.contact_email}
                </Text>
              </TouchableOpacity>
            )}
            {artist.availability_notes && (
              <Text style={styles.infoText}>
                📅 {artist.availability_notes}
              </Text>
            )}
          </RNView>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Links</Text>
            {artist.spotify_url && (
              <TouchableOpacity
                style={styles.socialLink}
                onPress={() => Linking.openURL(artist.spotify_url!)}
              >
                <Text style={styles.socialLinkText}>🎵 Spotify</Text>
              </TouchableOpacity>
            )}
            {artist.instagram_url && (
              <TouchableOpacity
                style={styles.socialLink}
                onPress={() => Linking.openURL(artist.instagram_url!)}
              >
                <Text style={styles.socialLinkText}>📷 Instagram</Text>
              </TouchableOpacity>
            )}
            {artist.merch_url && (
              <TouchableOpacity
                style={styles.socialLink}
                onPress={() => Linking.openURL(artist.merch_url!)}
              >
                <Text style={styles.socialLinkText}>🛍️ Merch</Text>
              </TouchableOpacity>
            )}
          </RNView>
        )}
      </ScrollView>
    </RNView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 16,
    opacity: 0.6,
    color: "#fff",
  },
  banner: {
    height: 140,
    backgroundColor: "#6366f1",
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  profileHeader: {
    alignItems: "center",
    marginTop: -40,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    borderWidth: 3,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 8,
  },
  location: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 4,
  },
  followersText: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  followButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#6366f1",
    alignItems: "center",
  },
  followButtonActive: {
    backgroundColor: "#6366f1",
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6366f1",
  },
  followButtonTextActive: {
    color: "#fff",
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  genreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 13,
    color: "#fff",
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#ddd",
  },
  infoText: {
    fontSize: 14,
    color: "#ddd",
    marginBottom: 6,
  },
  linkText: {
    fontSize: 14,
    color: "#6366f1",
    marginBottom: 6,
  },
  socialLink: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 8,
  },
  socialLinkText: {
    fontSize: 15,
    color: "#fff",
  },
})
