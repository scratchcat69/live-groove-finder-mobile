export type DistanceUnit = "mi" | "km"

const KM_PER_MILE = 1.60934
const MILES_PER_KM = 0.621371

export function convertDistance(
  distance: number,
  from: DistanceUnit,
  to: DistanceUnit
): number {
  if (from === to) return distance
  return from === "km" ? distance * MILES_PER_KM : distance * KM_PER_MILE
}

export function formatDistance(
  distanceKm: number,
  unit: DistanceUnit
): string {
  const value =
    unit === "km" ? distanceKm : distanceKm * MILES_PER_KM
  if (value < 0.1) return `< 0.1 ${unit}`
  if (value < 10) return `${value.toFixed(1)} ${unit}`
  return `${Math.round(value)} ${unit}`
}

export function convertRadiusToKm(
  radius: number,
  unit: DistanceUnit
): number {
  return unit === "km" ? radius : radius * KM_PER_MILE
}
