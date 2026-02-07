import { useState } from "react"
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"

interface CheckInModalProps {
  visible: boolean
  eventName: string
  onSubmit: (rating: number, review: string) => void
  onClose: () => void
  isSubmitting: boolean
}

function StarRating({
  rating,
  onRate,
}: {
  rating: number
  onRate: (value: number) => void
}) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <TouchableOpacity
          key={value}
          onPress={() => onRate(value)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.star, value <= rating && styles.starFilled]}>
            {value <= rating ? "\u2605" : "\u2606"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export function CheckInModal({
  visible,
  eventName,
  onSubmit,
  onClose,
  isSubmitting,
}: CheckInModalProps) {
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState("")

  const handleSubmit = () => {
    onSubmit(rating, review.trim())
    setRating(5)
    setReview("")
  }

  const handleClose = () => {
    setRating(5)
    setReview("")
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Check In</Text>
          <Text style={styles.eventName} numberOfLines={2}>
            {eventName}
          </Text>

          <Text style={styles.label}>Rating</Text>
          <StarRating rating={rating} onRate={setRating} />

          <Text style={styles.label}>Review (optional)</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience..."
            placeholderTextColor="#666"
            value={review}
            onChangeText={setReview}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Check In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 350,
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  eventName: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  star: {
    fontSize: 36,
    color: "#555",
  },
  starFilled: {
    color: "#f59e0b",
  },
  reviewInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    padding: 12,
    minHeight: 80,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  cancelText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#6366f1",
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
