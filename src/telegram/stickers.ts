import config from "../config"
import type { Attaches } from "../types/max/opcodes/IncomingMessage"
import type { FileFormData } from "../types/util"
import { getDocumentForm } from "./documents"

function wrapStickerBlob(arrayBuffer: ArrayBuffer): FileFormData {
  const compressedSticker = Bun.gzipSync(arrayBuffer)
  const blob = new Blob([compressedSticker], { type: "application/x-tgsticker" })
  return ["sticker", blob, "sticker.tgs"]
}

async function getLottieStickerBlob(sticker: Attaches): Promise<FileFormData | undefined> {
  if (!sticker.lottieUrl) {
    return undefined
  }
  try {
    // Telegram Bot API doesn't support sending tgs by url (https://core.telegram.org/bots/api#sendsticker)
    const stickerRequest = await fetch(sticker.lottieUrl, {
      headers: {
        "User-Agent": config.userAgent.headerUserAgent,
      },
    })
    if (!stickerRequest.ok) {
      console.error(`Failed to fetch sticker: ${String(stickerRequest.status)} ${sticker.lottieUrl}`)
      return undefined
    }
    return wrapStickerBlob(await stickerRequest.arrayBuffer())
  }
  catch (err) {
    console.error(`Failed to fetch sticker: ${err instanceof Error ? err.message : String(err)}`)
    return undefined
  }
}

export async function getStickerForm(sticker: Attaches): Promise<FileFormData | undefined> {
  if (sticker.stickerType === "LOTTIE") {
    return getLottieStickerBlob(sticker)
  }
  return getDocumentForm("sticker", sticker)
}
