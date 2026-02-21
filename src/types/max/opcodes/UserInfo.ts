export interface UserInfoInput {
  contactIds: number[]
}

export interface UserInfoOutput {
  contacts: Contact[]
}

export interface Contact {
  accountStatus: number
  country: string
  baseUrl?: string
  names: Name[]
  options: string[]
  photoId?: number
  updateTime: number
  id: number
  baseRawUrl?: string
  gender?: number
  link?: string
  description?: string
}

export interface Name {
  name?: string
  firstName?: string
  lastName?: string
  type?: string
}
