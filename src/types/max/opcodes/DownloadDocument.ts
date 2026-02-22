export interface DownloadDocumentInput {
  fileId: number
  chatId: number
  messageId: string
}

export interface DownloadDocumentOutput {
  unsafe: boolean
  url: string
}
