import config from "../config"
import { DEFAULT_CONTACT_NAME } from "../consts"
import type { TelegramForwardOption } from "../types/config"
import type { Attaches, Message } from "../types/max/opcodes/IncomingMessage"
import type { StalledMessage } from "../types/messages"
import { getDocumentForm } from "./documents"
import { formatMessage } from "./formatting"
import { getStickerForm } from "./stickers"

async function logTelegramError(action: string, res: Response): Promise<void> {
  if (res.ok) {
    return
  }
  const text = await res.text()
  console.error(`Failed to send ${action} to Telegram: ${String(res.status)} ${text}`)
}

function appendThreadId(formData: FormData, to: TelegramForwardOption): void {
  if (!to.threadId) {
    return
  }
  formData.append("thread_id", to.threadId.toString())
}

async function postTelegramForm(action: string, endpoint: string, formData: FormData): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/${endpoint}`, {
    body: formData,
    method: "POST",
  })
  await logTelegramError(action, res)
}

async function sendTextToTelegram(message: Message, to: TelegramForwardOption, from: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
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
  await logTelegramError("message", res)
}

async function sendPhotoToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const photoLink = attach.baseUrl
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendPhoto`, {
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
  await logTelegramError("photo", res)
}

async function sendVideoToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const videoInfo = await getDocumentForm("video", attach)
  if (!videoInfo) {
    return
  }
  const [_videoType, videoBlob, videoFilename] = videoInfo
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append("video", videoBlob, `${videoFilename ?? "video"}.mp4`)
  appendThreadId(formData, to)
  await postTelegramForm("video", "sendVideo", formData)
}

async function sendStickerToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const stickerInfo = await getStickerForm(attach)
  if (!stickerInfo) {
    return
  }
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append(...stickerInfo)
  appendThreadId(formData, to)
  await postTelegramForm("sticker", "sendSticker", formData)
}

async function sendDocumentToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const documentInfo = await getDocumentForm("document", attach)
  if (!documentInfo) {
    return
  }
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append(...documentInfo)
  appendThreadId(formData, to)
  await postTelegramForm("document", "sendDocument", formData)
}

async function sendLocationToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append("latitude", attach.latitude?.toString() ?? "0")
  formData.append("longitude", attach.longitude?.toString() ?? "0")
  formData.append("zoom", attach.zoom?.toString() ?? "1")
  appendThreadId(formData, to)
  await postTelegramForm("location", "sendLocation", formData)
}

async function sendContactToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append("phone_number", attach.phoneNumber?.toString() ?? "")
  formData.append("first_name", attach.firstName?.toString() ?? "")
  formData.append("last_name", attach.lastName?.toString() ?? "")
  appendThreadId(formData, to)
  await postTelegramForm("contact", "sendContact", formData)
}

async function sendVoiceToTelegram(attach: Attaches, to: TelegramForwardOption): Promise<void> {
  const voiceInfo = await getDocumentForm("voice", attach)
  if (!voiceInfo) {
    return
  }
  const formData = new FormData()
  formData.append("chat_id", to.chatId.toString())
  formData.append(...voiceInfo)
  appendThreadId(formData, to)
  await postTelegramForm("voice", "sendVoice", formData)
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
      case "STICKER":
        await sendStickerToTelegram(attach, to)
        break
      case "LOCATION":
        await sendLocationToTelegram(attach, to)
        break
      case "CONTACT":
        await sendContactToTelegram(attach, to)
        break
      case "AUDIO":
        await sendVoiceToTelegram(attach, to)
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
