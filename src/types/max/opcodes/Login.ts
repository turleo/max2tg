export interface LoginInput {
  interactive: true
  token: string
  chatsCount: number
  chatsSync: 0
  contactsSync: 0
  presenceSync: 0
  draftsSync: number
}

export interface LoginOutput {
  videoChatHistory: boolean
  profile: Profile
  chats: Chat[]
  chatMarker: number
  time: number
  contacts: unknown
}

interface Profile {
  profileOptions: unknown
  contact: Contact
}

interface Contact {
  accountStatus: number
  country: string
  names: Name[]
  phone: number
  options: string[]
  updateTime: number
  id: number
}

interface Name {
  name: string
  firstName: string
  lastName: string
  type: string
}

interface Chat {
  owner: number
  joinTime: number
  created: number
  lastMessage: LastMessage
  type: string
  lastFireDelayedErrorTime: number
  lastDelayedUpdateTime: number
  prevMessageId: string
  modified: number
  lastEventTime: number
  id: number
  status: string
  participants: Participants
  hasBots?: boolean
  restrictions?: number
  newMessages?: number
  options?: Options
  cid?: number
}

interface LastMessage {
  sender: number
  id: string
  time: number
  text: string
  type: string
  cid?: number
  attaches: Attach[]
  elements?: Element[]
  options?: number
}

interface Attach {
  _type: string
  keyboard: Keyboard
  callbackId: string
}

interface Keyboard {
  buttons: Button[][]
}

interface Button {
  text: string
  type: string
  payload?: string
  intent?: string
  url?: string
}

interface Element {
  type: string
  length: number
  from?: number
}

type Participants = Record<number, number>

interface Options {
  SERVICE_CHAT: boolean
}
