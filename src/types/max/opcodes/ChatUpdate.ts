import type { ChatId, UserId } from "../common"

export interface ChatUpdateOutput {
  setAsUnread: boolean
  chatId: ChatId
  userId: UserId
  unread: number
  mark: number
}

export type ChatUpdateInput = undefined
