import {
  StyleSheet,
  View as RNView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native"
import { useState, useCallback, useMemo } from "react"
import { useRouter } from "expo-router"
import { FlashList } from "@shopify/flash-list"

import { Text, useThemeColor } from "@/components/Themed"
import { useLocation } from "@/src/hooks/useLocation"
import { useDebounce } from "@/src/hooks/useDebounce"
import { useDistanceUnit } from "@/src/hooks/useDistanceUnit"
import { useNearbyArtists, NearbyArtist } from "@/src/hooks/useNearbyArtists"
import { useFavorites } from "@/src/hooks/useFavorites"
import { convertRadiusToKm } from "@/src/utils/distanceUtils"
import { ArtistCard } from "@/src/components/artists/ArtistCard"
import { SearchBar } from "@/src/components/artists/SearchBar"
import { GenreFilter } from "@/src/components/artists/GenreFilter"
import { RadiusSelector } from "@/src/components/artists/RadiusSelector"

export default function ArtistsScreen() {
  const backgroundColor = useThemeColor({}, "background")
  const router = useRouter()
  const { unit } = useDistanceUnit()
  const {
    location,
    loading: locationLoading,
    error: locationError,
    permissionStatus,
    requestPermission,
    refreshLocation,
  } = useLocation()

  const [searchText, setSearchText] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [radius, setRadius] = useState(25)

  const debouncedSearch = useDebounce(searchText, 400)
  const radiusKm = useMemo(
    () => convertRadiusToKm(radius, unit),
    [radius, unit]
  )

  const {
    data: artists = [],
    isLoading: artistsLoading,
    refetch,
  } = useNearbyArtists({
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    radiusKm,
    genres: selectedGenres.length > 0 ? selectedGenres : undefined,
    searchQuery: debouncedSearch || undefined,
    enabled: !!location,
  })

  const { isFavorite, toggleFavorite } = useFavorites("artist")

  const handleGenreToggle = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    )
  }, [])

  const handleArtistPress = useCallback(
    (artist: NearbyArtist) => {
      router.push(`/(tabs)/artists/${artist.id}` as any)
    },
    [router]
  )

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      refreshLocation()
    }
  }

  // Permission gate
  if (permissionStatus && permissionStatus !== "granted") {
    return (
      <RNView style={[styles.container, { backgroundColor }]}>
        <RNView style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📍</Text>
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            We need your location to find artists near you.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </RNView>
      </RNView>
    )
  }

  // Loading location
  if (locationLoading || (!location && !locationError)) {
    return (
      <RNView
        style={[styles.container, styles.centerContent, { backgroundColor }]}
      >
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </RNView>
    )
  }

  const locationDisplay = location?.city
    ? `${location.city}${location.region ? `, ${location.region}` : ""}`
    : "Your Area"

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      {/* Filters */}
      <RNView style={styles.filters}>
        <RNView style={styles.locationRow}>
          <Text style={styles.locationLabel}>📍 {locationDisplay}</Text>
        </RNView>
        <RNView style={styles.searchRow}>
          <SearchBar value={searchText} onChangeText={setSearchText} />
        </RNView>
        <RadiusSelector
          value={radius}
          onValueChange={setRadius}
          unit={unit}
        />
        <GenreFilter selected={selectedGenres} onToggle={handleGenreToggle} />
      </RNView>

      {/* Artist List */}
      <FlashList
        data={artists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ArtistCard
            artist={item}
            distanceUnit={unit}
            isFavorite={isFavorite(item.id)}
            onPress={() => handleArtistPress(item)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <RNView style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={artistsLoading && artists.length === 0}
            onRefresh={refetch}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          artistsLoading ? (
            <RNView style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
            </RNView>
          ) : (
            <RNView style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎸</Text>
              <Text style={styles.emptyTitle}>No Artists Found</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch
                  ? `No results for "${debouncedSearch}". Try a different search.`
                  : `No artists found within ${radius} ${unit}. Try increasing the radius.`}
              </Text>
            </RNView>
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.6,
  },
  filters: {
    gap: 12,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  locationRow: {
    paddingHorizontal: 16,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  searchRow: {
    paddingHorizontal: 16,
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 10,
  },
  emptyContainer: {
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
    color: "#fff",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    color: "#fff",
    textAlign: "center",
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    opacity: 0.6,
    color: "#fff",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
