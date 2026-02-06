import { StyleSheet, View } from "react-native"
import Slider from "@react-native-community/slider"
import { Text } from "@/components/Themed"
import { DistanceUnit } from "@/src/utils/distanceUtils"

interface RadiusSelectorProps {
  value: number
  onValueChange: (value: number) => void
  unit: DistanceUnit
  min?: number
  max?: number
  step?: number
}

export function RadiusSelector({
  value,
  onValueChange,
  unit,
  min = 5,
  max = 100,
  step = 5,
}: RadiusSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Radius</Text>
        <Text style={styles.value}>
          {value} {unit}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onSlidingComplete={onValueChange}
        minimumTrackTintColor="#6366f1"
        maximumTrackTintColor="#333"
        thumbTintColor="#6366f1"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: "#aaa",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  slider: {
    width: "100%",
    height: 32,
  },
})
