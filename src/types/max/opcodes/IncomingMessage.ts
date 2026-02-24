export interface IncomingMessageInput {
  chatId: number
  messageId: string
}

export interface IncomingMessageOutput {
  chatId: number
  unread: number
  message: Message
  ttl: boolean
  mark: number
  prevMessageId: string
}

export interface Message {
  sender: number
  id: string
  time: number
  text: string
  type: string
  cid: number
  elements?: Element[]
  attaches: Attaches[]
  link?: {
    chatName?: string
    message: Message
  }
}

export interface Element {
  type: string
  from?: number
  length: number
  attributes?: {
    url?: string
  }
}

export interface Attaches {
  _type: string
  baseUrl: string
  lottieUrl?: string
  stickerType?: string
  url?: string
  videoId?: number
  fileId?: number
  name?: string
  latitude?: number
  longitude?: number
  zoom?: number
  phoneNumber?: string
  firstName?: string
  lastName?: string
}
