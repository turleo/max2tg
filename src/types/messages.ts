import type { Attaches, IncomingMessageOutput } from "./max/opcodes/IncomingMessage"

export interface StalledMessage {
  message: IncomingMessageOutput["message"]
  chatId: number
  from?: string
  requestsLeft: number
  downloadedAttaches: Attaches[]
}
