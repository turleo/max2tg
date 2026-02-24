import { DEFAULT_CHAT_NAME } from "../consts"
import type { Attaches, Element as MaxFormatting, Message } from "../types/max/opcodes/IncomingMessage"
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

function formatTitle(message: Message, from: string): string {
  let title = `💁‍♂️ ${from}`
  if (message.link?.type === "FORWARD") {
    title += `➡️ ${message.link.chatName ?? DEFAULT_CHAT_NAME}`
  }
  else if (message.link?.type === "REPLY") {
    title += `↩️`
  }
  title += "\n\n"
  return title
}

export function formatMessage(message: Message, from: string): TelegramMessage {
  const title = formatTitle(message, from)
  const defaultMessage = message.link?.type === "FORWARD" ? message.link.message : message
  const formatting = formatFormatting(defaultMessage.elements ?? [], title.length)
  let messageText = defaultMessage.text
  if (messageText) {
    messageText = `${messageText}\n\n`
  }
  const attaches = defaultMessage.attaches.map(attachToString).join(",")
  return {
    entities: formatting,
    text: `${title}${messageText}${attaches}`,
  }
}
