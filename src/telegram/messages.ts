import config from "../config"
import type { TelegramForwardOption } from "../types/config"
import type { Attaches } from "../types/max/opcodes/IncomingMessage"
import type { StalledMessage } from "../types/messages"
import type { TelegramMessage } from "../types/telegram"
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
  formData.append("message_thread_id", to.threadId.toString())
}

async function postTelegramForm(action: string, endpoint: string, formData: FormData): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/${endpoint}`, {
    body: formData,
    method: "POST",
  })
  await logTelegramError(action, res)
}

export async function sendAlertToTelegram(text: string): Promise<void> {
  const to = config.adminNotifictions
  if (to === null) {
    console.error(text)
    return
  }
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: to.chatId,
      message_thread_id: to.threadId,
      text,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  await logTelegramError("alert", res)
}

async function sendTextToTelegram(stalledMessage: StalledMessage, to: TelegramForwardOption): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: to.chatId,
      message_thread_id: to.threadId,
      ...formatMessage(stalledMessage),
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  await logTelegramError("message", res)
}

const MAX_MEDIA_PER_GROUP = 10

type MediaAttach = Attaches & { _type: "PHOTO" }

function isMediaAttach(attach: Attaches): attach is MediaAttach {
  return attach._type === "PHOTO"
}

function getMediaAttachType(attach: Attaches): "photo" | "video" | "document" {
  if (attach._type === "PHOTO") {
    return "photo"
  }
  if (attach._type === "VIDEO") {
    return "video"
  }
  return "document"
}

async function sendMediaGroupToTelegram(attaches: MediaAttach[], to: TelegramForwardOption, caption?: TelegramMessage): Promise<void> {
  if (attaches.length === 0) {
    return
  }

  const media = attaches.map((attach, index) => {
    const base = {
      media: attach.baseUrl,
      type: getMediaAttachType(attach),
    } as {
      type: "photo" | "video" | "document"
      media: string
      caption?: string
      caption_entities?: TelegramMessage["entities"]
    }

    if (caption && index === 0) {
      base.caption = caption.text
      base.caption_entities = caption.entities
    }

    return base
  })

  const payload = {
    chat_id: to.chatId,
    media,
  } as {
    chat_id: string | number
    media: typeof media
    message_thread_id?: number
  }

  if (to.threadId) {
    payload.message_thread_id = to.threadId
  }

  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMediaGroup`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  await logTelegramError("media group", res)
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

// eslint-disable-next-line
async function sendMessageToTelegram(message: StalledMessage, to: TelegramForwardOption) {
  const attaches: Attaches[] = [
    ...message.message.attaches,
    ...(message.message.link?.message.attaches ?? []),
    ...message.downloadedAttaches,
  ]

  const photoAttaches: MediaAttach[] = []
  const otherAttaches: Attaches[] = []
  const downloadableMediaAttaches: Attaches[] = []

  for (const attach of attaches) {
    if (isMediaAttach(attach)) {
      photoAttaches.push(attach)
    }
    else if (attach._type === "VIDEO" && !attach.videoId) {
      downloadableMediaAttaches.push(attach)
    }
    else if (attach._type === "FILE" && !attach.fileId) {
      downloadableMediaAttaches.push(attach)
    }
    else {
      // Use only "resolved" video/file attachments that came from download responses,
      // Skip initial VIDEO/FILE attaches that still have ids (they are handled via download opcodes).
      otherAttaches.push(attach)
    }
  }

  for (const attach of otherAttaches) {
    switch (attach._type) {
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

  if (photoAttaches.length === 0) {
    await sendTextToTelegram(message, to)
  }

  const caption = formatMessage(message)

  for (let photoIndex = 0; photoIndex < photoAttaches.length; photoIndex += MAX_MEDIA_PER_GROUP) {
    const chunk = photoAttaches.slice(photoIndex, photoIndex + MAX_MEDIA_PER_GROUP)
    const chunkCaption = photoIndex === 0 ? caption : undefined
    await sendMediaGroupToTelegram(chunk, to, chunkCaption)
  }

  for (const attach of downloadableMediaAttaches) {
    if (attach._type === "VIDEO") {
      await sendVideoToTelegram(attach, to)
    }
    else if (attach._type === "FILE") {
      await sendDocumentToTelegram(attach, to)
    }
  }
}

function forwardMessageToConfiguredChats(message: StalledMessage): boolean {
  const forwardTo = config.forward.filter(forward => forward.from === message.chatId)
  for (const forward of forwardTo) {
    sendMessageToTelegram(message, forward.to).catch(console.error)
  }
  return forwardTo.length === 0
}

function forwardMessageToWildcard(message: StalledMessage): void {
  const forwardWildcard = config.forward.filter(forward => forward.from === undefined)
  for (const forward of forwardWildcard) {
    message.wildcardFrom = true
    sendMessageToTelegram(message, forward.to).catch(console.error)
  }
}

export function handleMessage(message: StalledMessage): StalledMessage | null {
  if (message.requestsLeft > 0) {
    return message
  }
  const forwarded = forwardMessageToConfiguredChats(message)
  if (!forwarded) {
    forwardMessageToWildcard(message)
  }
  return null
}
