defmodule Max2tg.Max.Client do
  def start_link do
    :ets.new(:last_messages, [:set, :public])
    Supervisor.start_link([
      {Max2tg.Max.Websocket, []}
    ], strategy: :one_for_one)
  end
end
