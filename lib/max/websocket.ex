defmodule Max2tg.Max.Websocket do
  use WebSockex
  require JSON
  require Logger

  def start_link(_opts \\ []) do
    user_agent = Application.get_env(:max2tg, MaxUserAgent, %{})
    url = Application.get_env(:max2tg, MaxWebsocket, "ws://localhost:8080/websocket")
    header_user_agent = Map.get(user_agent, "headerUserAgent", "max2tg")
    extra_headers = [
      {"Origin", "https://web.max.ru"},
      {"Sec-Fetch-Mode", "websocket"},
      {"Sec-Fetch-Site", "cross-site"},
      {"User-Agent", header_user_agent}
    ]

    WebSockex.start_link(url, __MODULE__, :fake_state, extra_headers: extra_headers, ssl_options: [:no_verify])
  end

  def handle_connect(_conn, state) do
    WebSockex.cast(self(), {:send_handshake})
    {:ok, state}
  end

  def handle_cast({:send_handshake}, state) do
    user_agent = Application.get_env(:max2tg, MaxUserAgent)
    device_id = Application.get_env(:max2tg, MaxDeviceId)
    message = {:opcode_handshake, 1, %{
      "deviceId" => device_id,
      "userAgent" => user_agent
    }}
    encoded_message = Max2tg.Max.MessageCoding.encode_message(message) |> JSON.encode!()
    {:reply, {:text, encoded_message}, state}
    end

  def handle_cast({:message, message}, state) do
    encoded_message = Max2tg.Max.MessageCoding.encode_message(message) |> JSON.encode!()
    {:reply, {:text, encoded_message}, state}
  end

  def handle_frame({:text, msg}, state) do
    Logger.info("Received Message: #{msg}")
    data = JSON.decode!(msg)
    message = Max2tg.Max.MessageCoding.decode_message(data)
     Max2tg.Max.Flow.handle_message(self(), message)
    {:ok, state}
  end

  def handle_disconnect(disconnect_map, state) do
    super(disconnect_map, state)
  end
end
