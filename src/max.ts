import { randomUUIDv7 } from "bun"
import { ERROR_CODE_ECONNRESET, FAILURE_ALERT_THRESHOLD, FAILURE_WINDOW_MS, HEARTBEAT_INTERVAL } from "./consts"
import encoder from "./max/encoder"
import { sendAlertToTelegram } from "./telegram/messages"
import type Config from "./types/config"
import type Message from "./types/max/Message"
import { allOpcodes, OPCODE_HANDSHAKE, OPCODE_HEARTBEAT, OPCODE_NOOP } from "./types/max/opcodes/opcodes"
import type { MessageOutput } from "./types/messages"

export interface MaxWebSocketClientInterface {
  queue: MessageOutput
  config: Config
  onNewMessage: (message: Message<typeof allOpcodes[number]>) => MessageOutput
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
  queue: MessageOutput = []
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

  constructor(config: Config, onNewMessage: (message: Message<typeof allOpcodes[number]>) => MessageOutput) {
    this.onNewMessage = onNewMessage
    this.config = config
  }

  addWebsocketListeners() {
    if (this.ws === undefined) {
      throw new Error("unreachable")
    }
    this.ws.addEventListener("message", (event: Bun.BunMessageEvent<ArrayBuffer>) => {
      this.onMessageListener(event)
    })
    this.ws.addEventListener("error", onErrorListener)
    this.ws.addEventListener("close", this.onCloseListener.bind(this))
    this.ws.addEventListener("open", this.flushQueue.bind(this))
  }

  async init() {
    console.info("Initializing WebSocket client")
    await this.recordInit()
    this.ws = new WebSocket(this.config.debug.websocketUrl ?? "wss://api.oneme.ru/websocket", {
      headers: {
        "Origin": "https://web.max.ru",
        "Sec-Fetch-Mode": "websocket",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": this.config.userAgent.headerUserAgent,
      },
    })
    this.addWebsocketListeners()
    this.ws.binaryType = "arraybuffer"
    this.heartbeatInterval = setInterval(() => {
      this.queue.push({
        opcode: OPCODE_HEARTBEAT,
        originalOpcode: OPCODE_NOOP,
        payload: { interactive: false },
        seq: 0,
      })
    }, HEARTBEAT_INTERVAL)
    console.info("WebSocket client initialized")
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
  }

  onMessageListener(event: Bun.BunMessageEvent<ArrayBuffer>) {
    try {
      const incomingMessage = encoder.fromBinary(event.data)
      const messages = this.onNewMessage(incomingMessage)
      this.queue = this.queue.concat(messages)
      this.flushQueue()
    }
    catch (err) {
      console.error("Failed to process WebSocket message")
      console.trace(err)
    }
  }

  onCloseListener() {
    console.warn("WebSocket closed")
    this.cleanup()
    if (this.config.debug.exitOnFailure) {
      process.exit(1)
    }
    this.init().catch(console.error)
  }

  // eslint-disable-next-line max-statements
  flushQueue() {
    const item = this.queue.shift()
    if (!item) {
      return
    }
    const { opcode, originalOpcode } = item
    if (opcode === OPCODE_NOOP) {
      return
    }
    let cmd = 0
    if (originalOpcode === opcode) {
      cmd = 1
    }
    const message = encoder.toBinary(item, cmd)
    try {
      this.ws?.send(message)
      this.flushQueue()
    }
    catch (err) {
      this.queue.push(item)
      console.error(`Failed to flush queue: ${err instanceof Error ? err.message : String(err)}`)
      console.trace(err)
    }
  }

  config: Config
  onNewMessage: (message: Message<(typeof allOpcodes)[number]>) => MessageOutput
  ws: WebSocket | undefined
  heartbeatInterval: NodeJS.Timeout | undefined
};
