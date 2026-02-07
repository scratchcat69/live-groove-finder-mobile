import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  View as RNView,
} from "react-native"

import { Text, View, useThemeColor } from "@/components/Themed"
import { useSubscription } from "@/src/hooks/useSubscription"
import { useRecognitionUsage } from "@/src/hooks/useRecognitionUsage"
import { useStripeCheckout } from "@/src/hooks/useStripeCheckout"
import { PREMIUM_PRICE, PREMIUM_FEATURES, RECOGNITION_LIMITS } from "@/src/constants/subscription"

export default function SubscriptionScreen() {
  const backgroundColor = useThemeColor({}, "background")
  const { tier, isPremium, subscription } = useSubscription()
  const { count, limit } = useRecognitionUsage()
  const { checkout, manageSubscription, isLoading } = useStripeCheckout()

  const handleUpgrade = async () => {
    try {
      await checkout()
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to start checkout")
    }
  }

  const handleManage = async () => {
    try {
      await manageSubscription()
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to open billing portal")
    }
  }

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Plan */}
        <RNView style={styles.planCard}>
          <RNView style={[styles.tierBadge, isPremium && styles.tierBadgePremium]}>
            <Text style={[styles.tierBadgeText, isPremium && styles.tierBadgeTextPremium]}>
              {tier.toUpperCase()}
            </Text>
          </RNView>
          <Text style={styles.planTitle}>
            {isPremium ? "Premium Plan" : "Free Plan"}
          </Text>
          {isPremium && periodEnd && (
            <Text style={styles.periodText}>
              {subscription?.cancel_at_period_end
                ? `Cancels on ${periodEnd}`
                : `Renews on ${periodEnd}`}
            </Text>
          )}
        </RNView>

        {/* Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recognition Usage</Text>
          <RNView style={styles.usageRow}>
            <Text style={styles.usageLabel}>This month</Text>
            <Text style={styles.usageValue}>
              {isPremium ? `${count} (Unlimited)` : `${count} / ${limit}`}
            </Text>
          </RNView>
          {!isPremium && (
            <RNView style={styles.usageBar}>
              <RNView
                style={[
                  styles.usageBarFill,
                  { width: `${Math.min(100, (count / limit) * 100)}%` },
                ]}
              />
            </RNView>
          )}
        </View>

        {/* Feature comparison (free users) */}
        {!isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upgrade to Premium</Text>
            <Text style={styles.priceText}>{PREMIUM_PRICE}/month</Text>

            {PREMIUM_FEATURES.map((feature) => (
              <RNView key={feature} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </RNView>
            ))}

            <RNView style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>
                {RECOGNITION_LIMITS.premium === Infinity ? "Unlimited" : RECOGNITION_LIMITS.premium} recognitions/month
              </Text>
            </RNView>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Manage subscription (premium users) */}
        {isPremium && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManage}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#6366f1" />
              ) : (
                <Text style={styles.manageButtonText}>Manage Subscription</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.manageHint}>
              Change plan, update payment, or cancel
            </Text>
          </View>
        )}
      </ScrollView>
    </RNView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  planCard: {
    alignItems: "center",
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#333",
    marginBottom: 12,
  },
  tierBadgePremium: {
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#aaa",
    letterSpacing: 1,
  },
  tierBadgeTextPremium: {
    color: "#6366f1",
  },
  planTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  periodText: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 6,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 14,
    color: "#aaa",
  },
  usageValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  usageBar: {
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    overflow: "hidden",
  },
  usageBarFill: {
    height: "100%",
    backgroundColor: "#6366f1",
    borderRadius: 3,
  },
  priceText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#6366f1",
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  featureCheck: {
    fontSize: 16,
    color: "#22c55e",
    fontWeight: "700",
  },
  featureText: {
    fontSize: 15,
    color: "#fff",
  },
  upgradeButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  manageButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6366f1",
    alignItems: "center",
  },
  manageButtonText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "600",
  },
  manageHint: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
})
