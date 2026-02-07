import { Stack } from "expo-router"

export default function ArtistsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Explore",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Artist",
        }}
      />
      <Stack.Screen
        name="venue/[id]"
        options={{
          title: "Venue",
        }}
      />
    </Stack>
  )
}
