import { useState, useEffect, useCallback } from "react"
import * as Location from "expo-location"

export interface UserLocation {
  latitude: number
  longitude: number
  city?: string
  region?: string
}

interface UseLocationReturn {
  location: UserLocation | null
  loading: boolean
  error: string | null
  permissionStatus: Location.PermissionStatus | null
  requestPermission: () => Promise<boolean>
  refreshLocation: () => Promise<void>
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setPermissionStatus(status)
      return status === "granted"
    } catch (err) {
      console.error("Error requesting location permission:", err)
      setError("Failed to request location permission")
      return false
    }
  }, [])

  const getLocation = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check permission first
      const { status } = await Location.getForegroundPermissionsAsync()
      setPermissionStatus(status)

      if (status !== "granted") {
        setError("Location permission not granted")
        setLoading(false)
        return
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const { latitude, longitude } = position.coords

      // Try to get city/region from reverse geocoding
      let city: string | undefined
      let region: string | undefined

      try {
        const [geocode] = await Location.reverseGeocodeAsync({ latitude, longitude })
        if (geocode) {
          city = geocode.city || undefined
          region = geocode.region || undefined
        }
      } catch {
        // Geocoding failed, but we still have coordinates
      }

      setLocation({ latitude, longitude, city, region })
    } catch (err) {
      console.error("Error getting location:", err)
      setError(err instanceof Error ? err.message : "Failed to get location")
    } finally {
      setLoading(false)
    }
  }, [])

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync()
      setPermissionStatus(status)

      // If already granted, get location
      if (status === "granted") {
        getLocation()
      }
    }
    checkPermission()
  }, [getLocation])

  return {
    location,
    loading,
    error,
    permissionStatus,
    requestPermission,
    refreshLocation: getLocation,
  }
}
