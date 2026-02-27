import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  View as RNView,
} from "react-native"
import { useRouter } from "expo-router"

import { Text, View, useThemeColor } from "@/components/Themed"
import { useAuthStore } from "@/src/stores/authStore"
import { useDistanceUnit } from "@/src/hooks/useDistanceUnit"
import { useNotificationPreferences } from "@/src/hooks/useNotificationPreferences"

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function SettingRow({
  label,
  value,
  onToggle,
  disabled,
}: {
  label: string
  value: boolean
  onToggle: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <RNView style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#333", true: "#6366f1" }}
        disabled={disabled}
      />
    </RNView>
  )
}

export default function SettingsScreen() {
  const backgroundColor = useThemeColor({}, "background")
  const router = useRouter()
  const { signOut, isLoading } = useAuthStore()
  const { unit, toggleUnit } = useDistanceUnit()
  const { preferences, updatePreference } = useNotificationPreferences()

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ])
  }

  return (
    <RNView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Preferences */}
        <SectionHeader title="PREFERENCES" />
        <View style={styles.section}>
          <RNView style={styles.settingRow}>
            <Text style={styles.settingLabel}>Distance Unit</Text>
            <RNView style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitOption, unit === "mi" && styles.unitOptionActive]}
                onPress={() => unit !== "mi" && toggleUnit()}
              >
                <Text style={[styles.unitOptionText, unit === "mi" && styles.unitOptionTextActive]}>
                  mi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitOption, unit === "km" && styles.unitOptionActive]}
                onPress={() => unit !== "km" && toggleUnit()}
              >
                <Text style={[styles.unitOptionText, unit === "km" && styles.unitOptionTextActive]}>
                  km
                </Text>
              </TouchableOpacity>
            </RNView>
          </RNView>
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.section}>
          <SettingRow
            label="Push Notifications"
            value={preferences.push_enabled}
            onToggle={(val) => updatePreference("push_enabled", val)}
          />
          {preferences.push_enabled && (
            <>
              <SettingRow
                label="Events Nearby"
                value={preferences.events_nearby}
                onToggle={(val) => updatePreference("events_nearby", val)}
              />
              <SettingRow
                label="Artist Performing"
                value={preferences.artist_performing}
                onToggle={(val) => updatePreference("artist_performing", val)}
              />
              <SettingRow
                label="Community Activity"
                value={preferences.community_activity}
                onToggle={(val) => updatePreference("community_activity", val)}
              />
            </>
          )}
        </View>

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/(tabs)/profile/subscription" as any)}
          >
            <Text style={styles.settingLabel}>Subscription</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/(tabs)/profile/edit" as any)}
          >
            <Text style={styles.settingLabel}>Edit Profile</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <SectionHeader title="LEGAL" />
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL("https://livegroovefinder.com/privacy")}
          >
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Alert.alert("Terms of Service", "Apple's standard EULA applies. Custom terms coming soon.")}
          >
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={isLoading}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingLabel: {
    fontSize: 16,
    color: "#fff",
  },
  settingLabelDisabled: {
    color: "#888",
  },
  chevron: {
    fontSize: 22,
    color: "#666",
    fontWeight: "300",
  },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#444",
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#222",
  },
  unitOptionActive: {
    backgroundColor: "#6366f1",
  },
  unitOptionText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  unitOptionTextActive: {
    color: "#fff",
  },
  signOutButton: {
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
    alignItems: "center",
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
})
