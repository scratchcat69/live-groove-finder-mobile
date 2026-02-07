const TM_AFFILIATE_ID = process.env.EXPO_PUBLIC_TICKETMASTER_AFFILIATE_ID || ""

export function enrichEventUrl(url: string): string {
  if (!TM_AFFILIATE_ID || !url) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}affiliateId=${TM_AFFILIATE_ID}`
}

export function enrichSpotifyUrl(url: string): string {
  // Placeholder for future Spotify Partner tracking
  return url
}
