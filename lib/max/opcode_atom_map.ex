defmodule Max2tg.Max.OpcodeAtomMap do
  def opcode_to_atom(opcode) do
    case opcode do
      1 -> :opcode_heartbeat
      5 -> :opcode_telemetry
      6 -> :opcode_handshake
      19 -> :opcode_login
      32 -> :opcode_user_info
      83 -> :opcode_download_video
      88 -> :opcode_download_document
      128 -> :opcode_incoming_message
      130 -> :opcode_chat_update
      132 -> :opcode_presence_update
      288 -> :opcode_auth
      289 -> :opcode_auth_status
      291 -> :opcode_auth_try
      292 -> :opcode_client_info
    end
  end

  def atom_to_opcode(atom) do
    case atom do
      :opcode_heartbeat -> 1
      :opcode_telemetry -> 5
      :opcode_handshake -> 6
      :opcode_login -> 19
      :opcode_user_info -> 32
      :opcode_download_video -> 83
      :opcode_download_document -> 88
      :opcode_incoming_message -> 128
      :opcode_chat_update -> 130
      :opcode_presence_update -> 132
      :opcode_auth -> 288
      :opcode_auth_status -> 289
      :opcode_auth_try -> 291
      :opcode_client_info -> 292
    end
  end
end
