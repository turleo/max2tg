import { randomUUIDv7 } from "bun"
import { HEARTBEAT_INTERVAL } from "./consts"
import type Config from "./types/config"
import type Message from "./types/max/Message"
import { allOpcodes, OPCODE_HANDSHAKE, OPCODE_HEARTBEAT, OPCODE_NOOP } from "./types/max/opcodes/opcodes"
import type { NextMessageOutput } from "./types/messages"

export interface MaxWebSocketClientInterface {
  queue: NextMessageOutput
  config: Config
  onNewMessage: (message: Message<typeof allOpcodes[number]>) => NextMessageOutput
  ws: WebSocket | undefined
  heartbeatInterval: NodeJS.Timeout | undefined
}

function onErrorListener(event: Event) {
  console.error(`WebSocket error`)
  console.trace(event)
}

export class MaxWebSocketClient implements MaxWebSocketClientInterface {
  queue: NextMessageOutput = []
  cleanup() {
    clearInterval(this.heartbeatInterval)
    try {
      this.ws?.close()
    }
    catch (_err) {
      /* WebSocket is already closed */
    }
  }

  constructor(config: Config, onNewMessage: (message: Message<typeof allOpcodes[number]>) => NextMessageOutput) {
    this.onNewMessage = onNewMessage
    this.config = config
  }

  init() {
    console.info("Initializing WebSocket client")
    this.ws = new WebSocket("wss://ws-api.oneme.ru/websocket", {
      headers: {
        "Origin": "https://web.max.ru",
        "Sec-Fetch-Mode": "websocket",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": this.config.userAgent.headerUserAgent,
      },
      proxy: {
        url: "http://localhost:8080",
      },
    })
    this.heartbeatInterval = setInterval(() => {
      this.ws?.send(JSON.stringify({
        cmd: 0,
        opcode: OPCODE_HEARTBEAT,
        payload: { interactive: false },
        seq: 0,
        ver: 11,
      }))
    }, HEARTBEAT_INTERVAL)
    console.info("WebSocket client initialized")
    this.ws.addEventListener("message", (event) => {
      this.onMessageListener(event)
    })
    this.queue.push(
      {
        opcode: OPCODE_HANDSHAKE,
        originalOpcode: OPCODE_NOOP,
        payload: {
          deviceId: this.config.deviceId ?? randomUUIDv7(),
          userAgent: this.config.userAgent,
        },
        seq: 0,
      },
    )
    this.ws.addEventListener("error", onErrorListener)
    this.ws.addEventListener("open", () => {
      this.flushQueue()
    })
  }

  onMessageListener(event: Bun.BunMessageEvent) {
    try {
      const incomingMessage = JSON.parse(event.data as string) as Message<typeof allOpcodes[number]>
      const messages = this.onNewMessage(incomingMessage)
      this.queue = this.queue.concat(messages)
      this.flushQueue()
    }
    catch (err) {
      console.error(`Failed to process WebSocket message: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  onCloseListener() {
    console.warn("WebSocket closed")
    this.cleanup()
    this.init()
  }

  // eslint-disable-next-line max-statements
  flushQueue() {
    const item = this.queue.shift()
    if (!item) {
      return
    }
    const { opcode, originalOpcode, payload, seq } = item
    if (opcode === OPCODE_NOOP) {
      return
    }
    let cmd = 0
    if (originalOpcode === opcode) {
      cmd = 1
    }
    const message = {
      cmd,
      opcode,
      payload,
      seq,
      ver: 11,
    }
    try {
      this.ws?.send(JSON.stringify(message))
      this.flushQueue()
    }
    catch (err) {
      this.queue.push(item)
      console.error(`Failed to flush queue: ${err instanceof Error ? err.message : String(err)}`)
      console.trace(err)
    }
  }

  config: Config
  onNewMessage: (message: Message<(typeof allOpcodes)[number]>) => NextMessageOutput
  ws: WebSocket | undefined
  heartbeatInterval: NodeJS.Timeout | undefined
};
