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

async function fetchDocumentResponse(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "User-Agent": config.userAgent.headerUserAgent,
    },
  })
}

async function fetchDocumentBlob(url: string): Promise<[Blob, string] | undefined> {
  try {
    const documentRequest = await fetchDocumentResponse(url)
    if (!documentRequest.ok) {
      console.error(`Failed to fetch document: ${String(documentRequest.status)} ${url}`)
      return undefined
    }
    const filename = getFilenameFromContentDisposition(documentRequest.headers.get("Content-Disposition"))
    return [await documentRequest.blob(), filename]
  }
  catch (err) {
    console.error(`Failed to fetch document: ${err instanceof Error ? err.message : String(err)}`)
    return undefined
  }
}

export async function getDocumentForm(type: string, document: Attaches): Promise<FileFormData | undefined> {
  const url = document.url ?? document.baseUrl
  if (!url) {
    return undefined
  }
  const data = await fetchDocumentBlob(url)
  if (!data) {
    return undefined
  }
  const [blob, filename] = data
  return [type, blob, filename]
}
