import { useState, useEffect, useCallback } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { DistanceUnit } from "@/src/utils/distanceUtils"

const STORAGE_KEY = "distance_unit"

export function useDistanceUnit() {
  const [unit, setUnit] = useState<DistanceUnit>("mi")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "km" || value === "mi") {
        setUnit(value)
      }
      setLoaded(true)
    })
  }, [])

  const toggleUnit = useCallback(async () => {
    const next: DistanceUnit = unit === "mi" ? "km" : "mi"
    setUnit(next)
    await AsyncStorage.setItem(STORAGE_KEY, next)
  }, [unit])

  return { unit, toggleUnit, loaded }
}
