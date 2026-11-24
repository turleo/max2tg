/* eslint-disable no-console */
import type Config from "./types/config"
import type { allOpcodesType, InputsMap, OutputsMap } from "./types/max/opcodes"

export enum MessageDirection {
  Incoming = "in",
  Outgoing = "out",
}
export class WsLogger {
  disabled = true

  constructor(config: Config) {
    this.disabled = !config.debug?.logWsMessages
    if (this.disabled) {
      return
    }
    console.log(JSON.stringify({ opcode: -1 }))
  }

  write<O extends allOpcodesType>(opcode: O, json: InputsMap[O] | OutputsMap[O], direction: MessageDirection) {
    if (this.disabled) {
      return
    }
    const line = JSON.stringify({
      direction,
      json,
      opcode,
    })
    console.log(line)
  }
}
