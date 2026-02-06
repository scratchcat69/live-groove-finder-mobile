import { StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Text } from "@/components/Themed"

const GENRES = [
  "Rock",
  "Jazz",
  "Blues",
  "Pop",
  "R&B",
  "Hip Hop",
  "Country",
  "Electronic",
  "Folk",
  "Indie",
  "Metal",
  "Classical",
  "Reggae",
  "Latin",
  "Soul",
]

interface GenreFilterProps {
  selected: string[]
  onToggle: (genre: string) => void
}

export function GenreFilter({ selected, onToggle }: GenreFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {GENRES.map((genre) => {
        const isActive = selected.includes(genre)
        return (
          <TouchableOpacity
            key={genre}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onToggle(genre)}
          >
            <Text
              style={[styles.chipText, isActive && styles.chipTextActive]}
            >
              {genre}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#333",
  },
  chipActive: {
    backgroundColor: "#6366f1",
  },
  chipText: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.8,
  },
  chipTextActive: {
    opacity: 1,
    fontWeight: "600",
  },
})
