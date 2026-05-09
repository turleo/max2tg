defmodule Max2tg.Max.Flow do
  require Logger

  def handle_message(pid, {:opcode_handshake, seq, _payload}) do
    WebSockex.cast(
      pid,
      {:message,
       {:opcode_login, seq,
        %{
          chatsCount: 40,
          chatsSync: 0,
          contactsSync: 0,
          draftsSync: 0,
          interactive: true,
          presenceSync: 0,
          token: Application.get_env(:max2tg, MaxToken)
        }}}
    )
  end

  def handle_message(_pid, {:opcode_login, _seq, payload}) do
    chats = Map.get(payload, "chats")

    chats_to_listen =
      Application.get_env(:max2tg, ChatMapping)
      |> Enum.map(fn chat -> Map.get(chat, :max) end)

    IO.inspect(chats_to_listen)
    Logger.info("Monitoring (at least on first page)")
    for chat <- chats do
      chat_id = Map.get(chat, "id")
      if Enum.find(chats_to_listen, fn chat -> chat_id == chat end) != nil do
        Logger.info("#{Map.get(chat, "type")}, #{Map.get(chat, "chat")}")
      end
    end
  end

  def handle_message(pid, {:opcode_incoming_message, seq, payload}) do
    chat_id = Map.get(payload, "chatId")
    message = Map.get(payload, "message")
    Logger.debug("Received Message: in chat #{chat_id}")
  end

  def handle_message(_pid, {opcode, _seq, _payload}) do
    Logger.info("Received Message")
    Logger.info("Opcode: #{opcode}")
  end
end
