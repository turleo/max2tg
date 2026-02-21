import type { ChatId, UserId } from "../common"

export interface IncomingMessageOutput {
  setAsUnread: boolean
  chatId: ChatId
  userId: UserId
  unread: number
  mark: number
}

export type IncomingMessageInput = undefined
