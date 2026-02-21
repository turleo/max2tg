import { randomUUIDv7 } from "bun"
import config from "./config"
import { DEFAULT_CONTACT_NAME } from "./consts"
import { handleMessage } from "./telegram"
import type Message from "./types/max/Message"
import type { allOpcodes, InputsMap, OutputsMap } from "./types/max/opcodes"
import type { LoginInput } from "./types/max/opcodes/Login"
import type { MessageInfoOutput } from "./types/max/opcodes/MessageInfo"
import { OPCODE_CHAT_UPDATE, OPCODE_HANDSHAKE, OPCODE_HEARTBEAT, OPCODE_INCOMING_MESSAGE, OPCODE_LOGIN, OPCODE_NOOP, OPCODE_USER_INFO } from "./types/max/opcodes/opcodes"
import type { UserInfoOutput } from "./types/max/opcodes/UserInfo"

const contacts: Record<number, string> = {}
let stalledMessage: MessageInfoOutput["message"] | null = null
let stalledMessageChatId: number | null = null

function createAuthMessage(): [LoginInput, typeof OPCODE_LOGIN] {
  if (!config.maxToken) {
    throw new Error("Max token is not set")
  }
  return [{
    chatsCount: 40,
    chatsSync: 0,
    contactsSync: 0,
    draftsSync: 0,
    interactive: true,
    presenceSync: 0,
    token: config.maxToken,
  }, OPCODE_LOGIN]
}

type NextMessageOutput = [InputsMap[typeof allOpcodes[number]], typeof allOpcodes[number]][]

export function nextMessage<O extends typeof allOpcodes[number]>(message: Message<O>): NextMessageOutput {
  // eslint-disable-next-line prefer-destructuring
  const payload: OutputsMap[O] = message.payload
  switch (message.opcode) {
    case OPCODE_NOOP:
      return [[{
        deviceId: config.deviceId ?? randomUUIDv7(),
        userAgent: config.userAgent,
      }, OPCODE_HANDSHAKE]]
    case OPCODE_HANDSHAKE:
      return [createAuthMessage()]
    case OPCODE_HEARTBEAT:
      return [[undefined, OPCODE_NOOP]]
    case OPCODE_INCOMING_MESSAGE:
      const { message: incomingMessage } = payload as MessageInfoOutput
      const answer: NextMessageOutput = [[{
        chatId: (payload as MessageInfoOutput).chatId,
        messageId: incomingMessage.id,
      }, OPCODE_INCOMING_MESSAGE]]
      if (Object.keys(contacts).includes(incomingMessage.sender.toString())) {
        handleMessage(incomingMessage, (payload as MessageInfoOutput).chatId, contacts[incomingMessage.sender] ?? DEFAULT_CONTACT_NAME)
      }
      else {
        stalledMessage = incomingMessage
        stalledMessageChatId = (payload as MessageInfoOutput).chatId
        answer.push([{
          contactIds: [incomingMessage.sender],
        }, OPCODE_USER_INFO])
      }
      return answer
    case OPCODE_LOGIN:
      return [[undefined, OPCODE_NOOP]]
    case OPCODE_USER_INFO:
      (payload as UserInfoOutput).contacts.forEach((contact) => {
        contacts[contact.id] = contact.names.map(name => `${name.firstName ?? ""} ${name.lastName ?? ""}`.trim()).join(", ")
      })
      if (stalledMessage) {
        handleMessage(stalledMessage, stalledMessageChatId ?? 0, contacts[stalledMessage.sender] ?? "Кто-то")
        stalledMessage = null
      }
      return [[undefined, OPCODE_NOOP]]
    case OPCODE_CHAT_UPDATE:
      return [[undefined, OPCODE_NOOP]]
    default:
      console.error(`Unknown opcode: ${message.opcode.toString()}`)
      return [[undefined as InputsMap[typeof allOpcodes[number]], OPCODE_NOOP]]
  }
}
