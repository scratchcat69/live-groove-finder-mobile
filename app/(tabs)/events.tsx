import {
  StyleSheet,
  FlatList,
  RefreshControl,
  View as RNView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native"
import { useCallback, useEffect, useState } from "react"
import { useFocusEffect } from "@react-navigation/native"

import { Text, View, useThemeColor } from "@/components/Themed"
import { useLocation } from "@/src/hooks/useLocation"
import { useEvents, Event } from "@/src/hooks/useEvents"

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatTime(timeString?: string): string {
  if (!timeString) return ""
  const [hours, minutes] = timeString.split(":")
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function formatPrice(priceRange?: { min: number; max: number; currency: string } | null): string {
  if (!priceRange) return ""
  if (priceRange.min === priceRange.max) {
    return `$${priceRange.min}`
  }
  return `$${priceRange.min} - $${priceRange.max}`
}

function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress} activeOpacity={0.8}>
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
      ) : (
        <RNView style={styles.eventImagePlaceholder}>
          <Text style={styles.eventImagePlaceholderText}>🎵</Text>
        </RNView>
      )}
      <RNView style={styles.eventContent}>
        <RNView style={styles.eventDateBadge}>
          <Text style={styles.eventDateText}>{formatDate(event.date)}</Text>
          {event.time && <Text style={styles.eventTimeText}>{formatTime(event.time)}</Text>}
        </RNView>
        <Text style={styles.eventName} numberOfLines={2}>
          {event.name}
        </Text>
        {event.venue && (
          <Text style={styles.eventVenue} numberOfLines={1}>
            📍 {event.venue.name}
            {event.venue.city && `, ${event.venue.city}`}
          </Text>
        )}
        <RNView style={styles.eventFooter}>
          {event.genre && (
            <RNView style={styles.genreBadge}>
              <Text style={styles.genreText}>{event.genre}</Text>
            </RNView>
          )}
          {event.priceRange && (
            <Text style={styles.priceText}>{formatPrice(event.priceRange)}</Text>
          )}
        </RNView>
      </RNView>
    </TouchableOpacity>
  )
}

export default function EventsScreen() {
  const backgroundColor = useThemeColor({}, "background")
  const {
    location,
    loading: locationLoading,
    error: locationError,
    permissionStatus,
    requestPermission,
    refreshLocation,
  } = useLocation()
  const { events, loading: eventsLoading, error: eventsError, fetchEvents, loadMore, hasMore } = useEvents()

  const [radius, setRadius] = useState(25)
  const [searchKeyword, setSearchKeyword] = useState("")

  // Fetch events when location is available
  const loadEvents = useCallback(() => {
    if (location) {
      fetchEvents({
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        keyword: searchKeyword || undefined,
      })
    }
  }, [location, radius, searchKeyword, fetchEvents])

  // Load events when location changes
  useEffect(() => {
    loadEvents()
  }, [location?.latitude, location?.longitude])

  // Refresh when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (location) {
        loadEvents()
      }
    }, [location, loadEvents])
  )

  const radiusOptions = [10, 25, 50, 100]

  const handleRadiusSelect = (value: number) => {
    setRadius(value)
    if (location) {
      fetchEvents({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: value,
        keyword: searchKeyword || undefined,
      })
    }
  }

  const handleEventPress = (event: Event) => {
    if (event.url) {
      Linking.openURL(event.url)
    }
  }

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      refreshLocation()
    }
  }

  // Show permission request if not granted
  if (permissionStatus && permissionStatus !== "granted") {
    return (
      <RNView style={[styles.container, { backgroundColor }]}>
        <RNView style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📍</Text>
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            We need your location to find concerts and events near you.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </RNView>
      </RNView>
    )
  }

  // Show loading while getting location
  if (locationLoading || (!location && !locationError)) {
    return (
      <RNView style={[styles.container, styles.centerContent, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </RNView>
    )
  }

  const locationDisplay = location?.city
    ? `${location.city}${location.region ? `, ${location.region}` : ""}`
    : "Your Area"

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <RNView style={styles.locationInfo}>
          <Text style={styles.locationLabel}>📍 {locationDisplay}</Text>
        </RNView>
        <RNView style={styles.radiusControl}>
          <Text style={styles.radiusLabel}>Radius</Text>
          <RNView style={styles.radiusOptions}>
            {radiusOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radiusChip,
                  radius === option && styles.radiusChipActive,
                ]}
                onPress={() => handleRadiusSelect(option)}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    radius === option && styles.radiusChipTextActive,
                  ]}
                >
                  {option} mi
                </Text>
              </TouchableOpacity>
            ))}
          </RNView>
        </RNView>
      </View>

      {/* Events List */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => handleEventPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={eventsLoading && events.length === 0}
            onRefresh={loadEvents}
            tintColor="#1DB954"
          />
        }
        onEndReached={() => {
          if (hasMore && !eventsLoading) {
            loadMore()
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          eventsLoading && events.length > 0 ? (
            <RNView style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#1DB954" />
            </RNView>
          ) : null
        }
        ListEmptyComponent={
          eventsLoading ? null : (
            <RNView style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎸</Text>
              <Text style={styles.emptyTitle}>No Events Found</Text>
              <Text style={styles.emptyText}>
                {eventsError
                  ? eventsError
                  : `No music events found within ${radius} miles. Try increasing the radius.`}
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
  filterBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  locationInfo: {
    marginBottom: 12,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  radiusControl: {
    gap: 8,
  },
  radiusLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  radiusOptions: {
    flexDirection: "row",
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#333",
  },
  radiusChipActive: {
    backgroundColor: "#1DB954",
  },
  radiusChipText: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.8,
  },
  radiusChipTextActive: {
    opacity: 1,
    fontWeight: "600",
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  eventCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
  },
  eventImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#333",
  },
  eventImagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
  },
  eventImagePlaceholderText: {
    fontSize: 48,
  },
  eventContent: {
    padding: 16,
  },
  eventDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  eventDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1DB954",
  },
  eventTimeText: {
    fontSize: 13,
    opacity: 0.7,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  eventVenue: {
    fontSize: 14,
    opacity: 0.7,
    color: "#fff",
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  genreBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  genreText: {
    fontSize: 11,
    color: "#fff",
    textTransform: "uppercase",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1DB954",
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
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
    backgroundColor: "#1DB954",
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
