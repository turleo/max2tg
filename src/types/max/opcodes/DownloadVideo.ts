export interface DownloadVideoInput {
  videoId: number
  chatId: number
  messageId: string
}

export type DownloadVideoOutput = Record<string, string>
