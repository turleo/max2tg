export interface AuthStatusInput {
  trackId: string
}

export interface AuthStatusOutput {
  status: { expiresAt: number, loginAvailable?: true }
}
