import { StyleSheet, TouchableOpacity, View as RNView } from "react-native"
import { Text } from "@/components/Themed"
import { NearbyArtist } from "@/src/hooks/useNearbyArtists"
import { formatDistance, DistanceUnit } from "@/src/utils/distanceUtils"

interface ArtistCardProps {
  artist: NearbyArtist
  distanceUnit: DistanceUnit
  isFavorite?: boolean
  onPress: () => void
  onToggleFavorite?: () => void
}

export function ArtistCard({
  artist,
  distanceUnit,
  isFavorite = false,
  onPress,
  onToggleFavorite,
}: ArtistCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <RNView style={styles.avatar}>
        <Text style={styles.avatarText}>
          {artist.name?.[0]?.toUpperCase() ?? "?"}
        </Text>
      </RNView>
      <RNView style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.genre && artist.genre.length > 0 && (
          <Text style={styles.genres} numberOfLines={1}>
            {artist.genre.join(" · ")}
          </Text>
        )}
        <Text style={styles.distance}>
          {formatDistance(artist.distance_km, distanceUnit)}
          {artist.location ? ` · ${artist.location}` : ""}
        </Text>
      </RNView>
      {onToggleFavorite && (
        <TouchableOpacity
          onPress={onToggleFavorite}
          style={styles.heartButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.heartIcon}>
            {isFavorite ? "❤️" : "🤍"}
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
  genres: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 2,
  },
  distance: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
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
