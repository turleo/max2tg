import { randomUUIDv7 } from "bun"
import { ERROR_CODE_ECONNRESET, FAILURE_ALERT_THRESHOLD, FAILURE_WINDOW_MS, HEARTBEAT_INTERVAL } from "./consts"
import { sendAlertToTelegram } from "./telegram/messages"
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
  previousInit: number
  initsInRaw: number
}

function onErrorListener(event: Event) {
  console.error(`WebSocket error`)
  console.trace(event)
}

export class MaxWebSocketClient implements MaxWebSocketClientInterface {
  queue: NextMessageOutput = []
  previousInit = Date.now()
  initsInRaw = 0

  async recordInit(): Promise<void> {
    if (this.initsInRaw > FAILURE_ALERT_THRESHOLD) {
      await sendAlertToTelegram(`⚠️ WebSocket disconnected ${this.initsInRaw.toString()} times in last ${FAILURE_ALERT_THRESHOLD.toString()} seconds`)
      process.exit(ERROR_CODE_ECONNRESET)
    }
    const now = Date.now()
    if (this.previousInit - now < FAILURE_WINDOW_MS) {
      this.initsInRaw += 1
    }
    else {
      this.initsInRaw = 0
    }
    this.previousInit = now
  }

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

  async init() {
    console.info("Initializing WebSocket client")
    await this.recordInit()
    this.ws = new WebSocket("wss://ws-api.oneme.ru/websocket", {
      headers: {
        "Origin": "https://web.max.ru",
        "Sec-Fetch-Mode": "websocket",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": this.config.userAgent.headerUserAgent,
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
    this.ws.addEventListener("close", () => {
      this.onCloseListener()
    })
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
    this.init().catch(console.error)
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
