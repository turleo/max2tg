export type AuthInput = undefined

export interface AuthOutput {
  pollingInterval: number
  qrLink: string
  ttl: number
  trackId: string
  expiresAt: number
}
