/* eslint-disable no-underscore-dangle */
import config from "./config"
import { DEFAULT_CHAT_NAME } from "./consts"
import type { TelegramForwardOption } from "./types/config"
import type { Attaches, Message } from "./types/max/opcodes/MessageInfo"

function formatMessage(message: Message, from: string): string {
  if (message.link) {
    return `💁‍♂️ ${from} ➡️${message.link.chatName ?? DEFAULT_CHAT_NAME}:\n\n${message.link.message.text}\n${message.link.message.attaches.map(attach => attach._type).join("\n")}`
  }
  return `**${from}**:\n${message.text}\n\n${message.attaches.map(attach => attach._type).join("\n")}`
}

/* eslint-disable camelcase */
async function sendTextMessageToTelegram(message: Message, to: TelegramForwardOption, from: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: to.chatId,
      text: formatMessage(message, from),
      thread_id: to.threadId,
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

export function handleMessage(message: Message, chatId: number, from: string) {
  const attaches = message.link ? message.link.message.attaches : message.attaches
  for (const forward of config.forward) {
    if (forward.from === chatId) {
      for (const attach of attaches) {
        if (attach._type === "PHOTO") {
          sendPhotoMessageToTelegram(attach, forward.to).catch(console.error)
        }
        else {
          console.error(`Unknown attach type: ${attach._type}`)
        }
      }
      sendTextMessageToTelegram(message, forward.to, from).catch(console.error)
    }
  }
}
