import { allOpcodes, type OutputsMap } from "./opcodes"

export default interface Message<O extends typeof allOpcodes[number]> {
  ver: number
  cmd: number
  seq: number
  opcode: O
  payload: OutputsMap[O]
}
