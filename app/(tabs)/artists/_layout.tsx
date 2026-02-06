import { Stack } from "expo-router"

export default function ArtistsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Nearby Artists",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Artist",
        }}
      />
    </Stack>
  )
}
