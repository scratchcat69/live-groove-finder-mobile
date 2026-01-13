import React, { useEffect } from "react"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated"
import { Text } from "@/components/Themed"

interface RecognitionButtonProps {
  onPress: () => void
  isListening: boolean
  isProcessing: boolean
  metering?: number
  duration?: number
}

const AnimatedView = Animated.createAnimatedComponent(View)

export function RecognitionButton({
  onPress,
  isListening,
  isProcessing,
  metering = -160,
  duration = 0,
}: RecognitionButtonProps) {
  // Pulsing ring animations
  const ring1Scale = useSharedValue(1)
  const ring2Scale = useSharedValue(1)
  const ring3Scale = useSharedValue(1)
  const ring1Opacity = useSharedValue(0)
  const ring2Opacity = useSharedValue(0)
  const ring3Opacity = useSharedValue(0)

  // Button scale for press feedback
  const buttonScale = useSharedValue(1)

  // Metering-based glow
  const glowIntensity = useSharedValue(0)

  useEffect(() => {
    if (isListening) {
      // Start pulsing rings
      ring1Scale.value = withRepeat(
        withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        false
      )

      ring2Scale.value = withDelay(
        300,
        withRepeat(
          withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      )
      ring2Opacity.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(0.5, { duration: 0 }),
            withTiming(0, { duration: 1500 })
          ),
          -1,
          false
        )
      )

      ring3Scale.value = withDelay(
        600,
        withRepeat(
          withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      )
      ring3Opacity.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(0.4, { duration: 0 }),
            withTiming(0, { duration: 1500 })
          ),
          -1,
          false
        )
      )
    } else {
      // Reset rings
      cancelAnimation(ring1Scale)
      cancelAnimation(ring2Scale)
      cancelAnimation(ring3Scale)
      cancelAnimation(ring1Opacity)
      cancelAnimation(ring2Opacity)
      cancelAnimation(ring3Opacity)

      ring1Scale.value = withTiming(1, { duration: 300 })
      ring2Scale.value = withTiming(1, { duration: 300 })
      ring3Scale.value = withTiming(1, { duration: 300 })
      ring1Opacity.value = withTiming(0, { duration: 300 })
      ring2Opacity.value = withTiming(0, { duration: 300 })
      ring3Opacity.value = withTiming(0, { duration: 300 })
    }
  }, [isListening])

  // Update glow based on metering
  useEffect(() => {
    if (isListening) {
      // Convert metering (-160 to 0) to glow intensity (0 to 1)
      const normalized = Math.max(0, Math.min(1, (metering + 60) / 60))
      glowIntensity.value = withTiming(normalized, { duration: 100 })
    } else {
      glowIntensity.value = withTiming(0, { duration: 300 })
    }
  }, [metering, isListening])

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }))

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }))

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }))

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value * 0.5,
    transform: [{ scale: 1 + glowIntensity.value * 0.1 }],
  }))

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `0:${seconds.toString().padStart(2, "0")}`
  }

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.95, { duration: 100 })
  }

  const handlePressOut = () => {
    buttonScale.value = withTiming(1, { duration: 100 })
  }

  return (
    <View style={styles.container}>
      {/* Pulsing rings */}
      <AnimatedView style={[styles.ring, ring1Style]} />
      <AnimatedView style={[styles.ring, ring2Style]} />
      <AnimatedView style={[styles.ring, ring3Style]} />

      {/* Glow effect based on audio level */}
      <AnimatedView style={[styles.glow, glowStyle]} />

      {/* Main button */}
      <AnimatedView style={[styles.buttonWrapper, buttonStyle]}>
        <TouchableOpacity
          style={[
            styles.button,
            isListening && styles.buttonListening,
            isProcessing && styles.buttonProcessing,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          disabled={isProcessing}
        >
          <View style={styles.buttonInner}>
            {isProcessing ? (
              <Text style={styles.buttonText}>...</Text>
            ) : isListening ? (
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            ) : (
              <Text style={styles.buttonIcon}>🎵</Text>
            )}
          </View>
        </TouchableOpacity>
      </AnimatedView>
    </View>
  )
}

const BUTTON_SIZE = 160
const RING_SIZE = 180

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE * 2,
    height: RING_SIZE * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: "#6366f1",
  },
  glow: {
    position: "absolute",
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    borderRadius: (BUTTON_SIZE + 40) / 2,
    backgroundColor: "#6366f1",
  },
  buttonWrapper: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonListening: {
    backgroundColor: "#ef4444",
  },
  buttonProcessing: {
    backgroundColor: "#8b5cf6",
  },
  buttonInner: {
    width: BUTTON_SIZE - 20,
    height: BUTTON_SIZE - 20,
    borderRadius: (BUTTON_SIZE - 20) / 2,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    fontSize: 48,
  },
  buttonText: {
    fontSize: 32,
    color: "#fff",
  },
  durationText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
})
