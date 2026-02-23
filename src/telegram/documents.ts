import config from "../config"
import { DEFAULT_FILENAME } from "../consts"
import type { Attaches } from "../types/max/opcodes/IncomingMessage"
import type { FileFormData } from "../types/util"

export function getFilenameFromContentDisposition(header: string | null): string {
  if (!header) {
    return DEFAULT_FILENAME
  }
  const match = /filename\*?=utf-8''(?<filename>[^;]+)/iu.exec(header)
  if (!match) {
    return DEFAULT_FILENAME
  }
  return match.groups?.filename?.trim() ?? DEFAULT_FILENAME
}

export async function getDocumentForm(type: string, document: Attaches): Promise<FileFormData | undefined> {
  const url = document.url ?? document.baseUrl
  if (!url) {
    return undefined
  }
  const documentRequest = await fetch(url, {
    headers: {
      "User-Agent": config.userAgent.headerUserAgent,
    },
  })
  return [type, await documentRequest.blob(), getFilenameFromContentDisposition(documentRequest.headers.get("Content-Disposition"))]
}
