import { StyleSheet, TouchableOpacity, View as RNView } from "react-native"
import { Text } from "@/components/Themed"
import { NearbyVenue } from "@/src/hooks/useNearbyVenues"
import { formatDistance, DistanceUnit } from "@/src/utils/distanceUtils"

interface VenueCardProps {
  venue: NearbyVenue
  distanceUnit: DistanceUnit
  isFavorite?: boolean
  onPress: () => void
  onToggleFavorite?: () => void
}

export function VenueCard({
  venue,
  distanceUnit,
  isFavorite = false,
  onPress,
  onToggleFavorite,
}: VenueCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <RNView style={styles.avatar}>
        <Text style={styles.avatarText}>
          {venue.name?.[0]?.toUpperCase() ?? "?"}
        </Text>
      </RNView>
      <RNView style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>
        <RNView style={styles.metaRow}>
          {venue.type && (
            <RNView style={styles.typeBadge}>
              <Text style={styles.typeText}>{venue.type}</Text>
            </RNView>
          )}
          {venue.capacity && (
            <Text style={styles.capacity}>
              {venue.capacity.toLocaleString()} cap
            </Text>
          )}
        </RNView>
        <Text style={styles.distance}>
          {formatDistance(venue.distance_km, distanceUnit)}
          {venue.location ? ` · ${venue.location}` : ""}
        </Text>
      </RNView>
      {onToggleFavorite && (
        <TouchableOpacity
          onPress={onToggleFavorite}
          style={styles.heartButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.heartIcon}>
            {isFavorite ? "\u2764\uFE0F" : "\uD83E\uDD0D"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  typeBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    color: "#aaa",
    textTransform: "capitalize",
  },
  capacity: {
    fontSize: 12,
    color: "#aaa",
  },
  distance: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 3,
    opacity: 0.8,
  },
  heartButton: {
    padding: 4,
    marginLeft: 8,
  },
  heartIcon: {
    fontSize: 20,
  },
})
