import { DEFAULT_CHAT_NAME } from "../consts"
import type { Attaches, Element as MaxFormatting } from "../types/max/opcodes/IncomingMessage"
import type { StalledMessage } from "../types/messages"
import type { Formatting as TelegramFormatting, TelegramMessage } from "../types/telegram"

function attachToString(attach: Attaches): string {
  switch (attach._type) {
    case "PHOTO":
      return "📷"
    case "VIDEO":
      return "🎥"
    case "FILE":
      return `📄 ${attach.name ?? ""}`
    case "STICKER":
      return "🗒️"
    case "LOCATION":
      return "📍"
    case "CONTACT":
      return `📞 ${attach.name ?? ""}`
    case "AUDIO":
      return "🎤"
    case "CONTROL":
      return `ℹ️ ${attach.event ?? JSON.stringify(attach)}`
    default:
      return attach._type
  }
}

const maxTypeToTelegramTypeMap: Record<string, TelegramFormatting["type"]> = {
  EMPHASIZED: "italic",
  LINK: "text_link",
  QUOTE: "blockquote",
  STRIKETHROUGH: "strikethrough",
  STRONG: "bold",
  UNDERLINE: "underline",
}

function formatFormatting(formatting: MaxFormatting[], titleLength: number): TelegramFormatting[] {
  const formatted = formatting.map((element) => {
    const formattedElement: Partial<TelegramFormatting> = {
      length: element.length,
      offset: (element.from ?? 0) + titleLength,
      type: maxTypeToTelegramTypeMap[element.type],
    }
    if (formattedElement.type === "text_link") {
      formattedElement.url = element.attributes?.url
    }
    return formattedElement
  })
  formatted.push({
    length: titleLength,
    offset: 0,
    type: "bold",
  })
  return formatted.filter(element => element.type !== undefined) as TelegramFormatting[]
}

function formatTitle(stalledMessage: StalledMessage): string {
  const { from, fromChatName, message, wildcardFrom } = stalledMessage
  let title = ""
  if (wildcardFrom) {
    title += `💬 ${fromChatName}\n`
  }
  title += `💁‍♂️ ${from}`
  if (message.link?.type === "FORWARD") {
    title += `➡️ ${message.link.chatName ?? DEFAULT_CHAT_NAME}`
  }
  if (message.link?.type === "REPLY") {
    title += `↩️`
  }
  return title
}

export function formatMessage(stalledMessage: StalledMessage): TelegramMessage {
  const { message } = stalledMessage
  const title = formatTitle(stalledMessage)
  const defaultMessage = message.link?.type === "FORWARD" ? message.link.message : message
  const formatting = formatFormatting(defaultMessage.elements ?? [], title.length)
  let messageText = defaultMessage.text
  if (messageText) {
    messageText = `${messageText}\n\n`
  }
  const attaches = defaultMessage.attaches.map(attachToString).join(",")
  return {
    entities: formatting,
    text: `${title}\n\n${messageText}${attaches}`,
  }
}
