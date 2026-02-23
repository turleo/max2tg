import config from "../config"
import type { Attaches } from "../types/max/opcodes/IncomingMessage"
import type { FileFormData } from "../types/util"
import { getDocumentForm } from "./documents"

async function getLottieStickerBlob(sticker: Attaches): Promise<FileFormData | undefined> {
  if (!sticker.lottieUrl) {
    return undefined
  }
  // Telegram Bot API doesn't support sending tgs by url (https://core.telegram.org/bots/api#sendsticker)
  const stickerRequest = await fetch(sticker.lottieUrl, {
    headers: {
      "User-Agent": config.userAgent.headerUserAgent,
    },
  })
  const compressedSticker = Bun.gzipSync(await stickerRequest.arrayBuffer())
  const blob = new Blob([compressedSticker], { type: "application/x-tgsticker" })
  return ["sticker", blob, "sticker.tgs"]
}

export async function getStickerForm(sticker: Attaches): Promise<FileFormData | undefined> {
  if (sticker.stickerType === "LOTTIE") {
    return getLottieStickerBlob(sticker)
  }
  return getDocumentForm("sticker", sticker)
}
