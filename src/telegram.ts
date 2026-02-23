/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import config from "./config"
import { DEFAULT_CONTACT_NAME } from "./consts"
import { formatMessage } from "./telegram/formatting"
import type { TelegramForwardOption } from "./types/config"
import type { Attaches, Message } from "./types/max/opcodes/MessageInfo"
import type { StalledMessage } from "./types/messages"

async function sendTextMessageToTelegram(message: Message, to: TelegramForwardOption, from: string): Promise<void> {
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

async function sendPhotoMessageToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
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

async function sendVideoMessageToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
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

const DEFAULT_FILENAME = "file.bin"
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

async function sendDocumentMessageToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
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
    if (attach._type === "PHOTO") {
      await sendPhotoMessageToTelegram(attach, to)
    }
    else if (attach._type === "VIDEO") {
      await sendVideoMessageToTelegram(attach, to)
    }
    else if (attach._type === "FILE") {
      await sendDocumentMessageToTelegram(attach, to)
    }
    else {
      console.error(`Unknown attach type: ${attach._type}`)
    }
  }
  await sendTextMessageToTelegram(message.message, to, message.from ?? DEFAULT_CONTACT_NAME)
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
