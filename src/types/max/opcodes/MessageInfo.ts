export interface MessageInfoInput {
  chatId: number
  messageId: string
}

export interface MessageInfoOutput {
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
  attaches: Attaches[]
  link?: {
    chatName?: string
    message: Message
  }
}

export interface Attaches {
  _type: string
  baseUrl: string
  url?: string
  videoId?: number
  fileId?: number
  name?: string
}
