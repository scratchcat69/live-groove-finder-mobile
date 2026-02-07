import { SubscriptionTier } from "../types/database"

export const RECOGNITION_LIMITS: Record<SubscriptionTier, number> = {
  free: 5,
  discovery: 50,
  premium: Infinity,
} as const

export const PREMIUM_PRICE = "$4.99"

export const PREMIUM_FEATURES = [
  "Unlimited song recognition",
  "Full discovery history",
  "Priority support",
] as const
