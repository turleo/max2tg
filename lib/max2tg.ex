defmodule Max2tg do
  def start_supervised do
    Supervisor.start_link([
      {Max2tg.Max.Websocket, []}
    ], strategy: :one_for_one)
  end

  def start do
    Max2tg.Max.Websocket.start_link()
  end
end
