export interface Formatting {
  type: "bold" | "italic" | "underline" | "strikethrough" | "spoiler" | "blockquote" | "expandable_blockquote" | "code" | "pre" | "text_link" | "text_mention" | "custom_emoji"
  offset: number
  length: number
  url?: string
}

export interface TelegramMessage {
  text: string
  entities: Formatting[]
}
