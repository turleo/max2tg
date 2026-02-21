export interface AuthTryInput {
  trackId: string
}

export interface AuthTryOutput {
  tokenAttrs: TokenAttrs
  profile: Profile
}

export interface TokenAttrs {
  LOGIN: Login
}

export interface Login {
  token: string
}

export interface Profile {
  profileOptions: unknown
  contact: Contact
}

export interface Contact {
  accountStatus: number
  country: string
  names: Name[]
  phone: number
  options: string[]
  updateTime: number
  id: number
}

export interface Name {
  name: string
  firstName: string
  lastName: string
  type: string
}
