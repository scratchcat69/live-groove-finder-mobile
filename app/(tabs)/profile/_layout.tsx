import { Stack } from "expo-router"

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Profile" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="subscription" options={{ title: "Subscription" }} />
    </Stack>
  )
}
