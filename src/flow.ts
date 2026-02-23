/* eslint-disable max-lines-per-function */
import { randomUUIDv7 } from "bun"
import config from "./config"
import { handleMessage } from "./telegram/messages"
import type Message from "./types/max/Message"
import type { allOpcodes, InputsMap, OutputsMap } from "./types/max/opcodes"
import type { DownloadDocumentOutput } from "./types/max/opcodes/DownloadDocument"
import type { DownloadVideoOutput } from "./types/max/opcodes/DownloadVideo"
import type { Attaches, IncomingMessageOutput } from "./types/max/opcodes/IncomingMessage"
import type { LoginInput } from "./types/max/opcodes/Login"
import { OPCODE_CHAT_UPDATE, OPCODE_CLIENT_INFO, OPCODE_DOWNLOAD_DOCUMENT, OPCODE_DOWNLOAD_VIDEO, OPCODE_HANDSHAKE, OPCODE_HEARTBEAT, OPCODE_INCOMING_MESSAGE, OPCODE_LOGIN, OPCODE_NOOP, OPCODE_PRESENCE_UPDATE, OPCODE_USER_INFO } from "./types/max/opcodes/opcodes"
import type { UserInfoOutput } from "./types/max/opcodes/UserInfo"
import type { StalledMessage } from "./types/messages"

const contacts: Record<number, string> = {}
let stalledMessage: StalledMessage | null = null

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

function downloadAttachments(message: IncomingMessageOutput["message"], chatId: number): NextMessageOutput {
  const attachments: Attaches[] = [...message.attaches, ...(message.link?.message.attaches ?? [])]
  const answer: NextMessageOutput = []
  for (const attachment of attachments) {
    if (attachment._type === "VIDEO") {
      answer.push([{
        chatId,
        messageId: message.id,
        videoId: attachment.videoId,
      }, OPCODE_DOWNLOAD_VIDEO])
    }
    else if (attachment._type === "FILE") {
      answer.push([{
        chatId,
        fileId: attachment.fileId,
        messageId: message.id,
      }, OPCODE_DOWNLOAD_DOCUMENT])
    }
  }
  return answer
}

function getVideoUrl(video: DownloadVideoOutput): string {
  const urlKeys = Object.keys(video).filter(key => key.startsWith("MP4_"))
  return video[urlKeys[0] ?? ""] ?? ""
}

function unwrapMessage(message: IncomingMessageOutput["message"], chatId: number): StalledMessage {
  return {
    chatId,
    downloadedAttaches: [],
    from: contacts[message.sender] ?? "Кто-то",
    message,
    requestsLeft: 0,
  }
}

const opcodeToAttachmentType: Partial<Record<typeof allOpcodes[number], Attaches["_type"]>> = {
  [OPCODE_DOWNLOAD_VIDEO]: "VIDEO",
  [OPCODE_DOWNLOAD_DOCUMENT]: "FILE",
}

type NextMessageOutput = [InputsMap[typeof allOpcodes[number]], typeof allOpcodes[number]][]

// eslint-disable-next-line max-statements
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
    case OPCODE_INCOMING_MESSAGE:
      const { message: incomingMessage } = payload as IncomingMessageOutput
      let answer: NextMessageOutput = [[{
        chatId: (payload as IncomingMessageOutput).chatId,
        messageId: incomingMessage.id,
      }, OPCODE_INCOMING_MESSAGE]]
      answer = answer.concat(downloadAttachments(incomingMessage, (payload as IncomingMessageOutput).chatId))
      stalledMessage = unwrapMessage(incomingMessage, (payload as IncomingMessageOutput).chatId)
      if (!Object.keys(contacts).includes(incomingMessage.sender.toString())) {
        answer.push([{
          contactIds: [incomingMessage.sender],
        }, OPCODE_USER_INFO])
      }
      // -1 for the incoming message itself
      stalledMessage.requestsLeft += answer.length - 1
      stalledMessage = handleMessage(stalledMessage)
      return answer
    case OPCODE_DOWNLOAD_VIDEO:
      if (stalledMessage) {
        stalledMessage.requestsLeft -= 1
        stalledMessage.downloadedAttaches.push({ _type: opcodeToAttachmentType[message.opcode], baseUrl: getVideoUrl(payload as DownloadVideoOutput) })
        stalledMessage = handleMessage(stalledMessage)
      }
      return [[undefined, OPCODE_NOOP]]
    case OPCODE_DOWNLOAD_DOCUMENT:
      if (stalledMessage) {
        stalledMessage.requestsLeft -= 1
        stalledMessage.downloadedAttaches.push({ _type: opcodeToAttachmentType[message.opcode], baseUrl: (payload as DownloadDocumentOutput).url })
        stalledMessage = handleMessage(stalledMessage)
      }
      return [[undefined, OPCODE_NOOP]]
    case OPCODE_USER_INFO:
      (payload as UserInfoOutput).contacts.forEach((contact) => {
        contacts[contact.id] = contact.names.map(name => `${name.firstName ?? ""} ${name.lastName ?? ""}`.trim()).join(", ")
      })
      if (stalledMessage) {
        stalledMessage.from = contacts[stalledMessage.message.sender] ?? "Кто-то"
        stalledMessage.requestsLeft -= 1
        stalledMessage = handleMessage(stalledMessage)
      }
      return [[undefined, OPCODE_NOOP]]
    case OPCODE_HEARTBEAT:
    case OPCODE_LOGIN:
    case OPCODE_CHAT_UPDATE:
    case OPCODE_PRESENCE_UPDATE:
    case OPCODE_CLIENT_INFO:
      return [[undefined, OPCODE_NOOP]]
    default:
      console.error(`Unknown opcode: ${message.opcode.toString()}`)
      return [[undefined as InputsMap[typeof allOpcodes[number]], OPCODE_NOOP]]
  }
}
