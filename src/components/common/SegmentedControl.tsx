import { StyleSheet, TouchableOpacity, View } from "react-native"
import { Text } from "@/components/Themed"

interface SegmentedControlProps {
  segments: string[]
  activeIndex: number
  onChange: (index: number) => void
}

export function SegmentedControl({
  segments,
  activeIndex,
  onChange,
}: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {segments.map((label, index) => {
        const isActive = index === activeIndex
        return (
          <TouchableOpacity
            key={label}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.segmentText, isActive && styles.segmentTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: "#333",
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#6366f1",
  },
  segmentText: {
    fontSize: 14,
    color: "#aaa",
    fontWeight: "500",
  },
  segmentTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
})
