import type { ChatId as MaxChatId } from "./max/common"
import type { HandshakeInput, UserAgent } from "./max/opcodes/Handshake"
import type { LoginInput } from "./max/opcodes/Login"

declare module "config.toml" {
  const value: Config
  export default value
}

export interface TelegramForwardOption {
  chatId: string | number
  threadId?: number
}

export default interface Config {
  telegramToken: string
  userAgent: UserAgent
  maxToken?: LoginInput["token"]
  deviceId?: HandshakeInput["deviceId"]
  forward: ForwardOption[]
}

interface ForwardOption {
  from: MaxChatId
  to: TelegramForwardOption
}
