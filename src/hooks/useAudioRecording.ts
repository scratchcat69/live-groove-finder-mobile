import { useState, useRef, useCallback, useEffect } from "react"
import { Audio } from "expo-av"
import { File } from "expo-file-system/next"

export type RecordingStatus = "idle" | "requesting" | "recording" | "processing"

interface UseAudioRecordingOptions {
  onAutoStop?: (audioBase64: string) => void
}

interface UseAudioRecordingReturn {
  status: RecordingStatus
  duration: number
  metering: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<string | null>
  cancelRecording: () => Promise<void>
  error: string | null
}

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 192000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 192000,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 192000,
  },
}

const MAX_DURATION_MS = 10000 // 10 seconds max

export function useAudioRecording(options?: UseAudioRecordingOptions): UseAudioRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>("idle")
  const [duration, setDuration] = useState(0)
  const [metering, setMetering] = useState(-160)
  const [error, setError] = useState<string | null>(null)

  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const onAutoStopRef = useRef(options?.onAutoStop)

  // Keep the callback ref updated
  useEffect(() => {
    onAutoStopRef.current = options?.onAutoStop
  }, [options?.onAutoStop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {})
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setStatus("requesting")

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        setError("Microphone permission denied")
        setStatus("idle")
        return
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      // Create and start recording
      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(RECORDING_OPTIONS)

      // Set up status updates for metering
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          setMetering(status.metering)
        }
      })

      await recording.startAsync()
      recordingRef.current = recording
      startTimeRef.current = Date.now()
      setStatus("recording")
      setDuration(0)

      // Update duration every 100ms
      timerRef.current = setInterval(async () => {
        const elapsed = Date.now() - startTimeRef.current
        setDuration(elapsed)

        // Auto-stop at max duration and trigger recognition
        if (elapsed >= MAX_DURATION_MS) {
          clearInterval(timerRef.current!)
          timerRef.current = null

          // Stop and get audio, then call the callback
          const audioBase64 = await stopRecording()
          if (audioBase64 && onAutoStopRef.current) {
            onAutoStopRef.current(audioBase64)
          }
        }
      }, 100)
    } catch (err) {
      console.error("Failed to start recording:", err)
      setError(err instanceof Error ? err.message : "Failed to start recording")
      setStatus("idle")
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) {
      return null
    }

    try {
      setStatus("processing")

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      })

      if (!uri) {
        setError("No recording URI")
        setStatus("idle")
        return null
      }

      // Read file and convert to base64
      console.log("=== AUDIO RECORDING STOP ===")
      console.log("Recording URI:", uri)
      const file = new File(uri)
      const base64 = await file.base64()
      console.log("Base64 length:", base64?.length)

      setStatus("idle")
      setDuration(0)
      setMetering(-160)

      return base64
    } catch (err) {
      console.error("Failed to stop recording:", err)
      setError(err instanceof Error ? err.message : "Failed to stop recording")
      setStatus("idle")
      return null
    }
  }, [])

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync()
      } catch {
        // Ignore errors when canceling
      }
      recordingRef.current = null
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    })

    setStatus("idle")
    setDuration(0)
    setMetering(-160)
    setError(null)
  }, [])

  return {
    status,
    duration,
    metering,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  }
}
