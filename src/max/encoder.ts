/* eslint-disable max-statements */
/* eslint-disable no-magic-numbers */
import { decode, encode } from "@msgpack/msgpack"
import { compressBlock, decompressBlock } from "lz4-lite"
import type Message from "../types/max/Message"
import type { allOpcodes, OutputsMap } from "../types/max/opcodes"
import type { AnyMessageOutputItem } from "../types/messages"

const HEADER_SIZE = 10

export default {
  fromBinary(messageBuffer: ArrayBuffer): Message<typeof allOpcodes[number]> {
    const message = new Uint8Array(messageBuffer)
    const messageDataView = new DataView(message.buffer)
    const cmd = messageDataView.getUint8(1)
    const seq = messageDataView.getUint16(2)
    const opcode = messageDataView.getUint16(4) as typeof allOpcodes[number]
    const compressionRatio = messageDataView.getUint8(6)

    let rawPayload: Uint8Array = message.slice(HEADER_SIZE)
    const expectedSize = compressionRatio * rawPayload.length
    if (compressionRatio > 0) {
      rawPayload = decompressBlock(rawPayload, expectedSize)
    }
    let payload: OutputsMap[typeof opcode] = {}
    if (rawPayload.length !== 0) {
      // TODO: add bigint and proper number decoding
      payload = decode(rawPayload) as OutputsMap[typeof opcode]
    }
    return {
      cmd,
      opcode,
      payload,
      seq,
    }
  },
  toBinary(item: AnyMessageOutputItem, cmd: number) {
    const encodedPayload = encode(item.payload)
    const compressedPayload = compressBlock(encodedPayload)
    const compressionRatio = Math.ceil(encodedPayload.length / compressedPayload.length)
    const payloadToBeSent = compressionRatio > 0 ? compressedPayload : encodedPayload

    const message = new Uint8Array(HEADER_SIZE + payloadToBeSent.length)
    const messageDataView = new DataView(message.buffer)
    messageDataView.setUint8(0, HEADER_SIZE)
    messageDataView.setUint8(1, cmd)
    messageDataView.setUint16(2, item.seq)
    messageDataView.setUint16(4, item.opcode)
    messageDataView.setUint8(6, compressionRatio)
    messageDataView.setUint8(7, payloadToBeSent.length >>> 16 & 255)
    messageDataView.setUint8(8, payloadToBeSent.length >>> 8 & 255)
    messageDataView.setUint8(9, payloadToBeSent.length & 255)
    message.set(payloadToBeSent, HEADER_SIZE)
    return message
  },
}
