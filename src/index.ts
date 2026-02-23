import config from "./config"
import { HEARTBEAT_INTERVAL } from "./consts"
import { nextMessage } from "./flow"
import type Message from "./types/max/Message"
import { allOpcodes, OPCODE_HANDSHAKE, OPCODE_HEARTBEAT, OPCODE_NOOP } from "./types/max/opcodes/opcodes"

const ws = new WebSocket("wss://ws-api.oneme.ru/websocket", {
  headers: {
    "Origin": "https://web.max.ru",
    "Sec-Fetch-Mode": "websocket",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": config.userAgent.headerUserAgent,
  },
})

function startHeartbeat() {
  setInterval(() => {
    ws.send(JSON.stringify({
      cmd: 0,
      opcode: OPCODE_HEARTBEAT,
      payload: { interactive: false },
      seq: 0,
      ver: 11,
    }))
  }, HEARTBEAT_INTERVAL)
}

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({
    cmd: 0,
    opcode: OPCODE_HANDSHAKE,
    payload: {
      deviceId: config.deviceId,
      userAgent: config.userAgent,
    },
    seq: 0,
    ver: 11,
  }))
  startHeartbeat()
})

ws.addEventListener("message", (event) => {
  const incomingMessage = JSON.parse(event.data as string) as Message<typeof allOpcodes[number]>
  const messages = nextMessage(incomingMessage)
  messages.forEach(([payload, opcode]) => {
    if (opcode === OPCODE_NOOP) {
      return
    }
    let cmd = 0
    if (incomingMessage.opcode === opcode) {
      cmd = 1
    }
    const message = {
      cmd,
      opcode,
      payload,
      seq: incomingMessage.seq,
      ver: 11,
    }
    ws.send(JSON.stringify(message))
  })
})

ws.addEventListener("close", () => {
  console.warn("WebSocket closed, exiting")
  process.exit()
})
