import type { AuthInput, AuthOutput } from "./Auth"
import type { AuthStatusInput, AuthStatusOutput } from "./AuthStatus"
import type { AuthTryInput, AuthTryOutput } from "./AuthTry"
import type { ClientInfoInput, ClientInfoOutput } from "./ClientInfo"
import type { DownloadDocumentInput, DownloadDocumentOutput } from "./DownloadDocument"
import type { DownloadVideoInput, DownloadVideoOutput } from "./DownloadVideo"
import type { HandshakeInput, HandshakeOutput } from "./Handshake"
import type { HeartbeatInput, HeartbeatOutput } from "./Heartbeat"
import type { IncomingMessageInput, IncomingMessageOutput } from "./IncomingMessage"
import type { LoginInput, LoginOutput } from "./Login"
import type { MessageInfoInput, MessageInfoOutput } from "./MessageInfo"
import * as opcodes from "./opcodes"
import type { TelemetryInput, TelemetryOutput } from "./Telemetry"
import type { UserInfoInput, UserInfoOutput } from "./UserInfo"

export interface InputsMap {
  [opcodes.OPCODE_NOOP]: undefined
  [opcodes.OPCODE_HEARTBEAT]: HeartbeatInput
  [opcodes.OPCODE_TELEMETRY]: TelemetryInput
  [opcodes.OPCODE_HANDSHAKE]: HandshakeInput
  [opcodes.OPCODE_LOGIN]: LoginInput
  [opcodes.OPCODE_USER_INFO]: UserInfoInput
  [opcodes.OPCODE_DOWNLOAD_VIDEO]: DownloadVideoInput
  [opcodes.OPCODE_DOWNLOAD_DOCUMENT]: DownloadDocumentInput
  [opcodes.OPCODE_INCOMING_MESSAGE]: MessageInfoInput
  [opcodes.OPCODE_CHAT_UPDATE]: IncomingMessageInput
  [opcodes.OPCODE_AUTH]: AuthInput
  [opcodes.OPCODE_AUTH_STATUS]: AuthStatusInput
  [opcodes.OPCODE_AUTH_TRY]: AuthTryInput
  [opcodes.OPCODE_CLIENT_INFO]: ClientInfoInput
}

export interface OutputsMap {
  [opcodes.OPCODE_NOOP]: undefined
  [opcodes.OPCODE_HEARTBEAT]: HeartbeatOutput
  [opcodes.OPCODE_TELEMETRY]: TelemetryOutput
  [opcodes.OPCODE_HANDSHAKE]: HandshakeOutput
  [opcodes.OPCODE_LOGIN]: LoginOutput
  [opcodes.OPCODE_USER_INFO]: UserInfoOutput
  [opcodes.OPCODE_DOWNLOAD_VIDEO]: DownloadVideoOutput
  [opcodes.OPCODE_DOWNLOAD_DOCUMENT]: DownloadDocumentOutput
  [opcodes.OPCODE_INCOMING_MESSAGE]: MessageInfoOutput
  [opcodes.OPCODE_CHAT_UPDATE]: IncomingMessageOutput
  [opcodes.OPCODE_AUTH]: AuthOutput
  [opcodes.OPCODE_AUTH_STATUS]: AuthStatusOutput
  [opcodes.OPCODE_AUTH_TRY]: AuthTryOutput
  [opcodes.OPCODE_CLIENT_INFO]: ClientInfoOutput
}

export const { allOpcodes } = opcodes
