import type { allOpcodes, InputsMap } from "./max/opcodes"
import type { Attaches, IncomingMessageOutput } from "./max/opcodes/IncomingMessage"

export type AnyMessageOutputItem = MessageOutputItem<typeof allOpcodes[number]>

export type MessageOutput = AnyMessageOutputItem[]

export interface MessageOutputItem<O extends typeof allOpcodes[number]> {
  payload: InputsMap[O]
  opcode: O
  originalOpcode: typeof allOpcodes[number]
  seq: number
}

export interface StalledMessage {
  message: IncomingMessageOutput["message"]
  chatId: number
  from: string
  fromChatName: string
  requestsLeft: number
  downloadedAttaches: Attaches[]
  wildcardFrom?: boolean
}
