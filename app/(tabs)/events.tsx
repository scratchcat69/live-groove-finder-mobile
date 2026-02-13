import {
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  View as RNView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native"
import { useCallback, useMemo, useRef, useState } from "react"
import { useFocusEffect } from "@react-navigation/native"

import { Text, View, useThemeColor } from "@/components/Themed"
import { useLocation } from "@/src/hooks/useLocation"
import { useEvents, Event, EventAttraction } from "@/src/hooks/useEvents"
import { useDebounce } from "@/src/hooks/useDebounce"
import { useCheckins } from "@/src/hooks/useCheckins"
import { useDistanceUnit } from "@/src/hooks/useDistanceUnit"
import { convertDistance } from "@/src/utils/distanceUtils"
import { CheckInModal } from "@/src/components/events/CheckInModal"
import { enrichEventUrl } from "@/src/utils/affiliateLinks"

// Normalize attractions from either string[] (old deployed edge function)
// or EventAttraction[] (new enriched format) into a consistent shape
function normalizeAttractions(attractions: (string | EventAttraction)[]): EventAttraction[] {
  return attractions.map((a, i) => {
    if (typeof a === "string") {
      return { id: `str-${i}`, name: a, imageUrl: null, url: null, genre: null }
    }
    return a
  })
}

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

function EventCard({
  event,
  onPress,
  onPerformerPress,
  onCheckIn,
  checkedIn,
}: {
  event: Event
  onPress: () => void
  onPerformerPress: (name: string) => void
  onCheckIn: () => void
  checkedIn: boolean
}) {
  // Normalize and filter out attractions whose name duplicates the event name
  const displayAttractions = normalizeAttractions(event.attractions).filter(
    (a) => a.name.toLowerCase() !== event.name.toLowerCase()
  )

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
        {displayAttractions.length > 0 && (
          <RNView style={styles.eventPerformersRow}>
            {displayAttractions.map((attraction, index) => (
              <TouchableOpacity
                key={attraction.id}
                onPress={() => onPerformerPress(attraction.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.eventPerformers} numberOfLines={1}>
                  {index > 0 ? " · " : ""}
                  {attraction.name}
                </Text>
              </TouchableOpacity>
            ))}
          </RNView>
        )}
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
          <TouchableOpacity
            style={[
              styles.checkInButton,
              checkedIn && styles.checkInButtonChecked,
            ]}
            onPress={onCheckIn}
            disabled={checkedIn}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.checkInButtonText,
                checkedIn && styles.checkInButtonTextChecked,
              ]}
            >
              {checkedIn ? "\u2713 Checked In" : "Check In"}
            </Text>
          </TouchableOpacity>
        </RNView>
      </RNView>
    </TouchableOpacity>
  )
}

function PerformerAvatar({ attraction }: { attraction: EventAttraction }) {
  if (attraction.imageUrl) {
    return <Image source={{ uri: attraction.imageUrl }} style={styles.performerImage} />
  }
  const initial = (attraction.name || "?").charAt(0).toUpperCase()
  return (
    <RNView style={styles.performerInitial}>
      <Text style={styles.performerInitialText}>{initial}</Text>
    </RNView>
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
  const { unit } = useDistanceUnit()

  const { isCheckedIn, createCheckin } = useCheckins()
  const [checkInEvent, setCheckInEvent] = useState<Event | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [radius, setRadius] = useState(25)
  const [searchKeyword, setSearchKeyword] = useState("")
  const debouncedKeyword = useDebounce(searchKeyword, 400)

  // Convert radius to miles for the API when user is in km mode
  const radiusMiles = unit === "km" ? Math.round(convertDistance(radius, "km", "mi")) : radius

  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    refresh,
    loadMore,
    hasMore,
    isFetchingNextPage,
  } = useEvents({
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    radius: radiusMiles,
    keyword: debouncedKeyword || undefined,
    enabled: !!location,
  })

  // Refresh when tab comes back into focus (skip initial mount)
  const hasMounted = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (hasMounted.current && location) {
        refresh()
      } else {
        hasMounted.current = true
      }
    }, [location, refresh])
  )

  // Derive unique performers from loaded events
  const uniquePerformers = useMemo(() => {
    const seen = new Set<string>()
    const performers: EventAttraction[] = []
    for (const event of events) {
      for (const attraction of normalizeAttractions(event.attractions)) {
        if (!seen.has(attraction.id)) {
          seen.add(attraction.id)
          performers.push(attraction)
        }
      }
    }
    return performers
  }, [events])

  const radiusOptions = [10, 25, 50, 100]

  const handleRadiusSelect = (value: number) => {
    setRadius(value)
  }

  const handleEventPress = (event: Event) => {
    if (event.url) {
      Linking.openURL(enrichEventUrl(event.url))
    }
  }

  const handlePerformerPress = (name: string) => {
    setSearchKeyword(name)
  }

  const handleCheckIn = async (rating: number, review: string) => {
    if (!checkInEvent) return
    setIsSubmitting(true)
    const success = await createCheckin({
      eventName: checkInEvent.name,
      eventDate: checkInEvent.date,
      eventDescription: checkInEvent.venue ? `${checkInEvent.venue.name}, ${checkInEvent.venue.city}` : undefined,
      rating,
      review,
    })
    setIsSubmitting(false)
    if (success) {
      setCheckInEvent(null)
      Alert.alert("Checked In!", "Your check-in has been saved.")
    } else {
      Alert.alert("Error", "Failed to check in. You may have already checked in to this event.")
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

  const listHeader = uniquePerformers.length > 0 ? (
    <RNView style={styles.carouselSection}>
      <Text style={styles.carouselTitle}>
        Performing Nearby ({uniquePerformers.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {uniquePerformers.map((performer) => (
          <TouchableOpacity
            key={performer.id}
            style={styles.performerCard}
            onPress={() => handlePerformerPress(performer.name)}
            activeOpacity={0.7}
          >
            <PerformerAvatar attraction={performer} />
            <Text style={styles.performerName} numberOfLines={1}>
              {performer.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </RNView>
  ) : null

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <RNView style={styles.locationInfo}>
          <Text style={styles.locationLabel}>📍 {locationDisplay}</Text>
        </RNView>
        <RNView style={styles.searchBarContainer}>
          <RNView style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholder="Search events or artists..."
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchKeyword.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchKeyword("")}
                style={styles.searchClear}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </RNView>
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
                  {option} {unit}
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
          <EventCard
            event={item}
            onPress={() => handleEventPress(item)}
            onPerformerPress={handlePerformerPress}
            onCheckIn={() => setCheckInEvent(item)}
            checkedIn={isCheckedIn(item.name, item.date)}
          />
        )}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={eventsLoading && events.length === 0}
            onRefresh={refresh}
            tintColor="#1DB954"
          />
        }
        onEndReached={() => loadMore()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
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
                  : `No music events found within ${radius} ${unit}. Try increasing the radius.`}
              </Text>
            </RNView>
          )
        }
      />

      <CheckInModal
        visible={!!checkInEvent}
        eventName={checkInEvent?.name ?? ""}
        onSubmit={handleCheckIn}
        onClose={() => setCheckInEvent(null)}
        isSubmitting={isSubmitting}
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
  searchBarContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    padding: 0,
  },
  searchClear: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  searchClearText: {
    color: "#aaa",
    fontSize: 12,
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
  // Performing Nearby carousel
  carouselSection: {
    marginBottom: 16,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  carouselContent: {
    gap: 16,
  },
  performerCard: {
    alignItems: "center",
    width: 72,
  },
  performerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#333",
  },
  performerInitial: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  performerInitialText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  performerName: {
    fontSize: 11,
    color: "#fff",
    marginTop: 6,
    textAlign: "center",
  },
  // Event card
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
    marginBottom: 4,
  },
  eventPerformersRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    overflow: "hidden",
    marginBottom: 8,
  },
  eventPerformers: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "500",
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
  checkInButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#22c55e",
    backgroundColor: "transparent",
  },
  checkInButtonChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  checkInButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
  },
  checkInButtonTextChecked: {
    color: "#fff",
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
