import type { Attaches, MessageInfoOutput } from "./max/opcodes/MessageInfo"

export interface StalledMessage {
  message: MessageInfoOutput["message"]
  chatId: number
  from?: string
  requestsLeft: number
  downloadedAttaches: Attaches[]
}
