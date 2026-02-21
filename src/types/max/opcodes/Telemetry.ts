export type TelemetryOutput = null

export interface TelemetryInput {
  events: Event[]
}

export interface Event {
  type: string
  userId: number
  time: number
  sessionId: number
  event: string
  params: Params
}

export interface Params {
  action_id: number
  screen_to?: number
  qr_ts_ms?: number
  action?: string
  platform?: string
  device_id?: string
  screen_from?: number
  prev_time?: number
}
