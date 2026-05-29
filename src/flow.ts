/* eslint-disable max-lines-per-function */
import config from "./config"
import { DEFAULT_CHAT_NAME, DEFAULT_CONTACT_NAME } from "./consts"
import { handleMessage } from "./telegram/messages"
import type Message from "./types/max/Message"
import type { allOpcodes, OutputsMap } from "./types/max/opcodes"
import type { DownloadDocumentOutput } from "./types/max/opcodes/DownloadDocument"
import type { DownloadVideoOutput } from "./types/max/opcodes/DownloadVideo"
import type { Attaches, IncomingMessageOutput } from "./types/max/opcodes/IncomingMessage"
import type { Chat, LoginOutput } from "./types/max/opcodes/Login"
import { OPCODE_CHAT_UPDATE, OPCODE_CLIENT_INFO, OPCODE_DOWNLOAD_DOCUMENT, OPCODE_DOWNLOAD_VIDEO, OPCODE_HANDSHAKE, OPCODE_HEARTBEAT, OPCODE_INCOMING_MESSAGE, OPCODE_LOGIN, OPCODE_NOOP, OPCODE_PRESENCE_UPDATE, OPCODE_USER_INFO } from "./types/max/opcodes/opcodes"
import type { UserInfoOutput } from "./types/max/opcodes/UserInfo"
import type { NextMessageOutput, NextMessageOutputItem, StalledMessage } from "./types/messages"

const contacts: Record<number, string> = {}
const chats: Record<number, string> = {}
let stalledMessage: StalledMessage | null = null

function getChatType(chat: Chat): string {
  if (chat.type === "CHANNEL") {
    return "📢"
  }
  else if (chat.type === "CHAT") {
    return "👥"
  }
  return "💬"
}

function getChatName(chat: Chat): string {
  const chatType = getChatType(chat)
  if (chat.title) {
    return `${chatType} ${chat.title}`
  }
  if (chat.type === "DIALOG") {
    if (chat.id === 0) {
      return `${chatType} Избранное`
    }
  }
  return `${chatType} (ID: ${chat.id.toString()})`
}

function isChatMonitored(chat: Chat): boolean {
  const monitoredIds = new Set(config.forward.map(forward => forward.from))
  return monitoredIds.has(chat.id) || (chat.cid !== undefined && monitoredIds.has(chat.cid))
}

function isEveryChatMonitored(): boolean {
  return config.forward.map(forward => forward.from).filter(forward => forward === undefined).length !== 0
}

function logMonitoredChats(incomingChats: Chat[]): void {
  const monitoredChats = incomingChats.filter(isChatMonitored)
  console.info("Monitoring:")
  for (const chat of monitoredChats) {
    const chatName = getChatName(chat)
    console.info(chatName)
  }
  if (isEveryChatMonitored()) {
    console.info("👀 All other chats")
  }
}

function createAuthMessage(): NextMessageOutputItem<typeof OPCODE_LOGIN> {
  if (!config.maxToken) {
    throw new Error("Max token is not set")
  }
  return {
    opcode: OPCODE_LOGIN,
    originalOpcode: OPCODE_NOOP,
    payload: {
      chatsCount: 40,
      chatsSync: 0,
      contactsSync: 0,
      draftsSync: 0,
      interactive: true,
      presenceSync: 0,
      token: config.maxToken,
    },
    seq: 0,
  }
}

function downloadAttachments(message: IncomingMessageOutput["message"], chatId: number, seq: number): NextMessageOutput {
  const attachments: Attaches[] = [...message.attaches, ...(message.link?.message.attaches ?? [])]
  const answer: NextMessageOutput = []
  for (const attachment of attachments) {
    if (attachment._type === "VIDEO") {
      answer.push({
        opcode: OPCODE_DOWNLOAD_VIDEO,
        originalOpcode: OPCODE_DOWNLOAD_VIDEO,
        payload: {
          chatId,
          messageId: message.id,
          videoId: attachment.videoId,
        },
        seq,
      })
    }
    else if (attachment._type === "FILE") {
      answer.push({
        opcode: OPCODE_DOWNLOAD_DOCUMENT,
        originalOpcode: OPCODE_DOWNLOAD_DOCUMENT,
        payload: {
          chatId,
          fileId: attachment.fileId,
          messageId: message.id,
        },
        seq,
      })
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
    from: contacts[message.sender] ?? DEFAULT_CONTACT_NAME,
    fromChatName: chats[chatId] ?? DEFAULT_CHAT_NAME,
    message,
    requestsLeft: 0,
  }
}

// eslint-disable-next-line max-statements
export function nextMessage<O extends typeof allOpcodes[number]>(message: Message<O>): NextMessageOutput {
  // eslint-disable-next-line prefer-destructuring
  const payload: OutputsMap[O] = message.payload
  switch (message.opcode) {
    case OPCODE_HANDSHAKE:
      return [createAuthMessage()]
    case OPCODE_INCOMING_MESSAGE:
      const { message: incomingMessage } = payload as IncomingMessageOutput
      let answer: NextMessageOutput = [{
        opcode: OPCODE_INCOMING_MESSAGE,
        originalOpcode: OPCODE_INCOMING_MESSAGE,
        payload: {
          chatId: (payload as IncomingMessageOutput).chatId,
          messageId: incomingMessage.id,
        },
        seq: message.seq,
      }]
      if (incomingMessage.status === "REMOVED") {
        return []
      }
      answer = answer.concat(downloadAttachments(incomingMessage, (payload as IncomingMessageOutput).chatId, message.seq))
      stalledMessage = unwrapMessage(incomingMessage, (payload as IncomingMessageOutput).chatId)
      if (incomingMessage.sender && !Object.keys(contacts).includes(incomingMessage.sender.toString())) {
        answer.push({
          opcode: OPCODE_USER_INFO,
          originalOpcode: OPCODE_INCOMING_MESSAGE,
          payload: {
            contactIds: [incomingMessage.sender],
          },
          seq: message.seq,
        })
      }
      // -1 for the incoming message itself
      stalledMessage.requestsLeft += answer.length - 1
      stalledMessage = handleMessage(stalledMessage)
      return answer
    case OPCODE_DOWNLOAD_VIDEO:
      if (stalledMessage) {
        stalledMessage.requestsLeft -= 1
        stalledMessage.downloadedAttaches.push({ _type: "VIDEO", baseUrl: getVideoUrl(payload as DownloadVideoOutput) })
        stalledMessage = handleMessage(stalledMessage)
      }
      return []
    case OPCODE_DOWNLOAD_DOCUMENT:
      if (stalledMessage) {
        stalledMessage.requestsLeft -= 1
        stalledMessage.downloadedAttaches.push({ _type: "FILE", baseUrl: (payload as DownloadDocumentOutput).url })
        stalledMessage = handleMessage(stalledMessage)
      }
      return []
    case OPCODE_USER_INFO:
      (payload as UserInfoOutput).contacts.forEach((contact) => {
        contacts[contact.id] = contact.names.map(name => `${name.firstName ?? ""} ${name.lastName ?? ""}`.trim()).join(", ")
      })
      if (stalledMessage) {
        stalledMessage.from = contacts[stalledMessage.message.sender] ?? "Кто-то"
        stalledMessage.requestsLeft -= 1
        stalledMessage = handleMessage(stalledMessage)
      }
      return []
    case OPCODE_LOGIN:
      logMonitoredChats((payload as LoginOutput).chats)
      for (const chat of (payload as LoginOutput).chats) {
        chats[chat.id] = getChatName(chat)
      }
      return []
    case OPCODE_HEARTBEAT:
    case OPCODE_CHAT_UPDATE:
    case OPCODE_PRESENCE_UPDATE:
    case OPCODE_CLIENT_INFO:
      return []
    default:
      console.error(`Unknown opcode: ${message.opcode.toString()}`)
      return []
  }
}
