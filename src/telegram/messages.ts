import config from "../config"
import { DEFAULT_CONTACT_NAME, DEFAULT_FILENAME } from "../consts"
import type { TelegramForwardOption } from "../types/config"
import type { Attaches, Message } from "../types/max/opcodes/IncomingMessage"
import type { StalledMessage } from "../types/messages"
import { formatMessage } from "./formatting"

async function sendTextToTelegram(message: Message, to: TelegramForwardOption, from: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: to.chatId,
      thread_id: to.threadId,
      ...formatMessage(message, from),
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
}

async function sendPhotoToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const photoLink = attach.baseUrl
  await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendPhoto`, {
    body: JSON.stringify({
      chat_id: to.chatId,
      photo: photoLink,
      thread_id: to.threadId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
}

async function sendVideoToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const videoLink = attach.baseUrl
  if (!videoLink) {
    return
  }
  const file = await fetch(videoLink, { headers: {
    "User-Agent": config.userAgent.headerUserAgent,
  } },
  )
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append("video", await file.blob(), "file.mp4")
  if (to.threadId) {
    formData.append("thread_id", to.threadId.toString())
  }
  await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendVideo`, {
    body: formData,
    method: "POST",
  })
}

function getFilenameFromContentDisposition(header: string | null): string {
  if (!header) {
    return DEFAULT_FILENAME
  }
  const match = /filename\*?=utf-8''(?<filename>[^;]+)/iu.exec(header)
  if (!match) {
    return DEFAULT_FILENAME
  }
  return match.groups?.filename?.trim() ?? DEFAULT_FILENAME
}

async function sendDocumentToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const documentLink = attach.baseUrl
  if (!documentLink) {
    return
  }
  const file = await fetch(documentLink, { headers: {
    "User-Agent": config.userAgent.headerUserAgent,
  } },
  )
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append("document", await file.blob(), getFilenameFromContentDisposition(file.headers.get("Content-Disposition")))
  if (to.threadId) {
    formData.append("thread_id", to.threadId.toString())
  }
  await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendDocument`, {
    body: formData,
    method: "POST",
  })
}

async function sendMessageToTelegram(message: StalledMessage, to: TelegramForwardOption) {
  const attaches: Attaches[] = [...message.message.attaches, ...(message.message.link?.message.attaches ?? []), ...message.downloadedAttaches]
  for (const attach of attaches) {
    switch (attach._type) {
      case "PHOTO":
        await sendPhotoToTelegram(attach, to)
        break
      case "VIDEO":
        await sendVideoToTelegram(attach, to)
        break
      case "FILE":
        await sendDocumentToTelegram(attach, to)
        break
      default:
        console.error(`Unknown attach type: ${attach._type}`)
    }
  }
  await sendTextToTelegram(message.message, to, message.from ?? DEFAULT_CONTACT_NAME)
}

export function handleMessage(message: StalledMessage): StalledMessage | null {
  if (message.requestsLeft > 0) {
    return message
  }
  for (const forward of config.forward) {
    if (forward.from === message.chatId) {
      sendMessageToTelegram(message, forward.to).catch(console.error)
    }
  }
  return null
}
