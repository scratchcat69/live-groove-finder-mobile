import React from "react"
import { StyleSheet, Modal, TouchableOpacity, View as RNView } from "react-native"
import { Text, View } from "@/components/Themed"
import { PREMIUM_PRICE, PREMIUM_FEATURES } from "@/src/constants/subscription"

interface PaywallModalProps {
  visible: boolean
  usageCount: number
  usageLimit: number
  onUpgrade: () => void
  onDismiss: () => void
}

export function PaywallModal({
  visible,
  usageCount,
  usageLimit,
  onUpgrade,
  onDismiss,
}: PaywallModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <RNView style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Recognition Limit Reached</Text>
          <Text style={styles.usage}>
            {usageCount}/{usageLimit} recognitions used this month
          </Text>

          <RNView style={styles.comparison}>
            <RNView style={styles.planColumn}>
              <Text style={styles.planTitle}>Free</Text>
              <Text style={styles.planFeature}>5 recognitions/month</Text>
              <Text style={styles.planFeature}>Basic discovery feed</Text>
            </RNView>
            <RNView style={[styles.planColumn, styles.premiumColumn]}>
              <Text style={[styles.planTitle, styles.premiumTitle]}>Premium</Text>
              {PREMIUM_FEATURES.map((feature) => (
                <Text key={feature} style={[styles.planFeature, styles.premiumFeature]}>
                  {feature}
                </Text>
              ))}
            </RNView>
          </RNView>

          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
            <Text style={styles.upgradeButtonText}>
              Upgrade to Premium — {PREMIUM_PRICE}/month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </RNView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  usage: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 24,
  },
  comparison: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  planColumn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 14,
  },
  premiumColumn: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  premiumTitle: {
    color: "#6366f1",
  },
  planFeature: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 6,
    lineHeight: 16,
  },
  premiumFeature: {
    opacity: 1,
    color: "#a5b4fc",
  },
  upgradeButton: {
    width: "100%",
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: "#aaa",
    fontSize: 14,
  },
})
