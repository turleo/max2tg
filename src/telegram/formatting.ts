/* eslint-disable no-underscore-dangle */
import { DEFAULT_CHAT_NAME } from "../consts"
import type { Attaches, Element as MaxFormatting, Message } from "../types/max/opcodes/MessageInfo"
import type { Formatting as TelegramFormatting, TelegramMessage } from "../types/telegram"

function attachToString(attach: Attaches): string {
  switch (attach._type) {
    case "PHOTO":
      return "📷"
    case "VIDEO":
      return "🎥"
    case "FILE":
      return `📄 ${attach.name ?? ""}`
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
  if (message.link) {
    return `💁‍♂️ ${from} ➡️${message.link.chatName ?? DEFAULT_CHAT_NAME}\n\n`
  }
  return `**${from}**\n\n`
}

export function formatMessage(message: Message, from: string): TelegramMessage {
  const title = formatTitle(message, from)
  const defaultMessage = message.link?.message ?? message
  const formatting = formatFormatting(defaultMessage.elements ?? [], title.length)
  const messageText = defaultMessage.text
  const attaches = defaultMessage.attaches.map(attachToString).join(",")
  return {
    entities: formatting,
    text: `${title}${messageText}\n\n${attaches}`,
  }
}
