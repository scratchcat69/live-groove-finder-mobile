import {
  StyleSheet,
  ScrollView,
  View as RNView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import { useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { Text, useThemeColor } from "@/components/Themed"
import { supabase } from "@/src/services/supabase"
import { queryKeys } from "@/src/services/queryClient"
import { useFavorites } from "@/src/hooks/useFavorites"
import type { Venue } from "@/src/types/database"

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const backgroundColor = useThemeColor({}, "background")

  const {
    data: venue,
    isLoading,
    error,
  } = useQuery<Venue | null>({
    queryKey: queryKeys.venues.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id!)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!id,
  })

  const { isFavorite, toggleFavorite } = useFavorites("venue")

  if (isLoading) {
    return (
      <RNView
        style={[styles.container, styles.centerContent, { backgroundColor }]}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </RNView>
    )
  }

  if (error || !venue) {
    return (
      <RNView
        style={[styles.container, styles.centerContent, { backgroundColor }]}
      >
        <Text style={styles.errorText}>Venue not found</Text>
      </RNView>
    )
  }

  const techSpecs =
    venue.technical_specs && typeof venue.technical_specs === "object"
      ? (venue.technical_specs as Record<string, string>)
      : null

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <RNView style={styles.banner}>
          <RNView style={styles.bannerOverlay} />
        </RNView>

        {/* Avatar & Name */}
        <RNView style={styles.profileHeader}>
          <RNView style={styles.avatar}>
            <Text style={styles.avatarText}>
              {venue.name[0]?.toUpperCase() ?? "?"}
            </Text>
          </RNView>
          <Text style={styles.name}>{venue.name}</Text>
          {venue.type && <Text style={styles.venueType}>{venue.type}</Text>}
          {venue.location && (
            <Text style={styles.location}>{"\uD83D\uDCCD"} {venue.location}</Text>
          )}
        </RNView>

        {/* Favorite Button */}
        <RNView style={styles.actionRow}>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(venue.id)}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite(venue.id) ? "\u2764\uFE0F" : "\uD83E\uDD0D"}
            </Text>
            <Text style={styles.favoriteLabel}>
              {isFavorite(venue.id) ? "Favorited" : "Favorite"}
            </Text>
          </TouchableOpacity>
        </RNView>

        {/* Details */}
        <RNView style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {venue.capacity != null && (
            <RNView style={styles.detailRow}>
              <Text style={styles.detailLabel}>Capacity</Text>
              <Text style={styles.detailValue}>
                {venue.capacity.toLocaleString()}
              </Text>
            </RNView>
          )}
          {venue.budget_range && (
            <RNView style={styles.detailRow}>
              <Text style={styles.detailLabel}>Budget Range</Text>
              <Text style={styles.detailValue}>{venue.budget_range}</Text>
            </RNView>
          )}
          {venue.booking_requirements && (
            <RNView style={styles.detailRow}>
              <Text style={styles.detailLabel}>Booking Requirements</Text>
              <Text style={styles.detailValue}>
                {venue.booking_requirements}
              </Text>
            </RNView>
          )}
        </RNView>

        {/* Description */}
        {venue.description && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{venue.description}</Text>
          </RNView>
        )}

        {/* Technical Specs */}
        {techSpecs && Object.keys(techSpecs).length > 0 && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Specs</Text>
            {Object.entries(techSpecs).map(([key, value]) => (
              <RNView key={key} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{key}</Text>
                <Text style={styles.detailValue}>{String(value)}</Text>
              </RNView>
            ))}
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
  venueType: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "600",
    textTransform: "capitalize",
    marginTop: 4,
  },
  location: {
    fontSize: 14,
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
  favoriteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#333",
  },
  favoriteIcon: {
    fontSize: 20,
  },
  favoriteLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  detailLabel: {
    fontSize: 14,
    color: "#aaa",
    textTransform: "capitalize",
  },
  detailValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#ddd",
  },
})
