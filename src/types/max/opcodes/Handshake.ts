export interface HandshakeInput {
  userAgent: UserAgent
  deviceId: string
}

export interface UserAgent {
  deviceType: string
  locale: string
  deviceLocale: string
  osVersion: string
  deviceName: string
  headerUserAgent: string
  appVersion: string
  screen: string
  timezone?: string
}

export interface HandshakeOutput {
  "phone-auth-enabled": boolean
  "reg-country-code": string[]
  "location": string
}
