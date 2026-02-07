import React from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import { Text } from "@/components/Themed"

interface UsageBadgeProps {
  count: number
  limit: number
  isPremium: boolean
  onPress: () => void
}

export function UsageBadge({ count, limit, isPremium, onPress }: UsageBadgeProps) {
  if (isPremium) {
    return (
      <TouchableOpacity style={[styles.badge, styles.premiumBadge]} onPress={onPress}>
        <Text style={styles.premiumText}>Unlimited</Text>
      </TouchableOpacity>
    )
  }

  const pct = limit > 0 ? count / limit : 0
  const colorStyle =
    pct >= 1 ? styles.badgeRed : pct >= 0.8 ? styles.badgeOrange : styles.badgeGreen

  return (
    <TouchableOpacity style={[styles.badge, colorStyle]} onPress={onPress}>
      <Text style={styles.badgeText}>
        {count}/{limit} recognitions
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "center",
  },
  badgeGreen: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  badgeOrange: {
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  badgeRed: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  premiumBadge: {
    backgroundColor: "rgba(99,102,241,0.15)",
  },
  premiumText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366f1",
  },
})
