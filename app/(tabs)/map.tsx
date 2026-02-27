import { useCallback, useRef, useState } from "react"
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native"
import MapView, { Marker, Callout, Region } from "react-native-maps"
import { useFocusEffect } from "@react-navigation/native"
import FontAwesome from "@expo/vector-icons/FontAwesome"

import { useLocation } from "@/src/hooks/useLocation"
import {
  useNearbyDiscoveries,
  TimeFilter,
} from "@/src/hooks/useNearbyDiscoveries"

const FILTER_OPTIONS: { key: TimeFilter; label: string }[] = [
  { key: "live", label: "Live Now" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
]

const LATITUDE_DELTA = 0.05
const LONGITUDE_DELTA = 0.05

function timeAgo(dateString: string | null): string {
  if (!dateString) return ""
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today")
  const hasMounted = useRef(false)

  const {
    location,
    loading: locationLoading,
    permissionStatus,
    requestPermission,
    refreshLocation,
  } = useLocation()

  const {
    discoveries,
    loading: discoveriesLoading,
    refresh,
  } = useNearbyDiscoveries(
    location?.latitude ?? null,
    location?.longitude ?? null,
    timeFilter
  )

  // Refresh data when tab gains focus (skip initial mount)
  useFocusEffect(
    useCallback(() => {
      if (hasMounted.current && location) {
        refresh()
      } else {
        hasMounted.current = true
      }
    }, [location, refresh])
  )

  const handleRecenter = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        },
        500
      )
    }
  }

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      refreshLocation()
    }
  }

  // Permission gate
  if (permissionStatus && permissionStatus !== "granted") {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📍</Text>
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            We need your location to show live music discoveries near you.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Loading location
  if (locationLoading || !location) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    )
  }

  const initialRegion: Region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle="dark"
      >
        {discoveries.map((d) => {
          if (d.latitude == null || d.longitude == null) return null
          return (
            <Marker
              key={d.id}
              coordinate={{
                latitude: d.latitude,
                longitude: d.longitude,
              }}
              pinColor="#6366f1"
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>
                    {d.song_title ?? "Unknown Song"}
                  </Text>
                  <Text style={styles.calloutArtist} numberOfLines={1}>
                    {d.song_artist ?? "Unknown Artist"}
                  </Text>
                  <Text style={styles.calloutMeta}>
                    {timeAgo(d.discovered_at)}
                    {d.location ? ` · ${d.location}` : ""}
                  </Text>
                </View>
              </Callout>
            </Marker>
          )
        })}
      </MapView>

      {/* Filter chips */}
      <View style={styles.filterOverlay}>
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.filterChip,
                timeFilter === opt.key && styles.filterChipActive,
              ]}
              onPress={() => setTimeFilter(opt.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  timeFilter === opt.key && styles.filterChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Discovery count badge */}
        <View style={styles.countBadge}>
          {discoveriesLoading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text style={styles.countText}>
              {discoveries.length}{" "}
              {discoveries.length === 1 ? "discovery" : "discoveries"}
            </Text>
          )}
        </View>
      </View>

      {/* Empty state card */}
      {!discoveriesLoading && discoveries.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Live Music Found</Text>
          <Text style={styles.emptyText}>
            No one has recognized a song{" "}
            {timeFilter === "live"
              ? "in the last 2 hours"
              : timeFilter === "today"
                ? "in the last 24 hours"
                : "this week"}
            . Try a wider time filter or recognize a song to put your spot on
            the map!
          </Text>
        </View>
      )}

      {/* Recenter button */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <FontAwesome name="crosshairs" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#aaa",
  },
  map: {
    flex: 1,
  },
  filterOverlay: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(26, 26, 26, 0.9)",
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#aaa",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  countBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(26, 26, 26, 0.9)",
  },
  countText: {
    fontSize: 12,
    color: "#aaa",
    fontWeight: "500",
  },
  callout: {
    minWidth: 160,
    maxWidth: 220,
    padding: 4,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 2,
  },
  calloutArtist: {
    fontSize: 13,
    color: "#6366f1",
    fontWeight: "500",
    marginBottom: 4,
  },
  calloutMeta: {
    fontSize: 11,
    color: "#666",
  },
  emptyCard: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 18,
  },
  recenterButton: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    color: "#aaa",
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
