export type PresenceUpdateInput = undefined

export interface PresenceUpdateOutput {
  userId: number
  presence: Presence
}

interface Presence {
  seen: number
}
