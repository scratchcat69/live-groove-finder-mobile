import { useState, useCallback } from "react"
import { useAuthStore } from "../stores/authStore"

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""

export interface RecognizedSong {
  title: string
  artist: string
  album?: string
  releaseDate?: string
  spotifyUrl?: string
  confidence: number
  matchType: "fingerprint" | "melody"
}

export interface RecognitionResult {
  success: boolean
  type: "commercial" | "humming" | "not_found"
  song?: RecognizedSong
  error?: string
}

export type RecognitionStatus = "idle" | "recognizing" | "success" | "not_found" | "error"

interface UseMusicRecognitionReturn {
  recognize: (audioBase64: string, location?: LocationData) => Promise<RecognitionResult>
  status: RecognitionStatus
  result: RecognitionResult | null
  reset: () => void
}

interface LocationData {
  name?: string
  latitude?: number
  longitude?: number
}

export function useMusicRecognition(): UseMusicRecognitionReturn {
  const [status, setStatus] = useState<RecognitionStatus>("idle")
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const user = useAuthStore((state) => state.user)

  const recognize = useCallback(
    async (audioBase64: string, location?: LocationData): Promise<RecognitionResult> => {
      setStatus("recognizing")
      setResult(null)

      try {
        const functionUrl = `${SUPABASE_URL}/functions/v1/recognize-music`

        const requestBody = JSON.stringify({
          audioBase64,
          userId: user?.id,
          location,
        })

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
          },
          body: requestBody,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Edge Function error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        const recognitionResult = data as RecognitionResult

        if (recognitionResult.success && recognitionResult.song) {
          setStatus("success")
        } else if (recognitionResult.type === "not_found") {
          setStatus("not_found")
        } else {
          setStatus("error")
        }

        setResult(recognitionResult)
        return recognitionResult
      } catch (err) {
        const errorResult: RecognitionResult = {
          success: false,
          type: "not_found",
          error: err instanceof Error ? err.message : "Recognition failed",
        }
        setResult(errorResult)
        setStatus("error")
        return errorResult
      }
    },
    [user?.id]
  )

  const reset = useCallback(() => {
    setStatus("idle")
    setResult(null)
  }, [])

  return {
    recognize,
    status,
    result,
    reset,
  }
}
