import { useState } from "react"
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  View as RNView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import FontAwesome from "@expo/vector-icons/FontAwesome"

import { Text, View, useThemeColor } from "@/components/Themed"
import { useAuthStore, useProfile } from "@/src/stores/authStore"
import { supabase } from "@/src/services/supabase"

export default function EditProfileScreen() {
  const backgroundColor = useThemeColor({}, "background")
  const profile = useProfile()
  const { updateProfile } = useAuthStore()
  const router = useRouter()

  const [username, setUsername] = useState(profile?.username ?? "")
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const displayAvatar = avatarUri ?? profile?.avatar_url

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const uploadAvatar = async (localUri: string): Promise<string | null> => {
    try {
      const user = useAuthStore.getState().user
      if (!user) return null

      const response = await fetch(localUri)
      const blob = await response.blob()
      const arrayBuffer = await new Response(blob).arrayBuffer()

      const ext = localUri.split(".").pop() ?? "jpg"
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
          upsert: true,
        })

      if (error) {
        console.error("Avatar upload error:", error.message)
        return null
      }

      const { data: urlData } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error("Avatar upload error:", error)
      return null
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const updates: { username?: string; avatar_url?: string } = {}

      if (username !== (profile?.username ?? "")) {
        updates.username = username
      }

      if (avatarUri) {
        const uploadedUrl = await uploadAvatar(avatarUri)
        if (uploadedUrl) {
          updates.avatar_url = uploadedUrl
        } else {
          Alert.alert("Error", "Failed to upload avatar image")
          setSaving(false)
          return
        }
      }

      if (Object.keys(updates).length === 0) {
        router.back()
        return
      }

      const success = await updateProfile(updates)
      if (success) {
        router.back()
      } else {
        Alert.alert("Error", "Failed to update profile")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      Alert.alert("Error", message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <RNView style={styles.content}>
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
          ) : (
            <RNView style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </RNView>
          )}
          <RNView style={styles.cameraBadge}>
            <FontAwesome name="camera" size={12} color="#fff" />
          </RNView>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </RNView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333",
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    fontSize: 13,
    color: "#888",
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    marginBottom: 32,
  },
  saveButton: {
    width: "100%",
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
