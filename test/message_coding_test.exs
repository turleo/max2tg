defmodule MessageCodingTest do
  use ExUnit.Case
  doctest Max2tg

  test "decode message" do
    message = %{"opcode" => 1, "seq" => 1, "payload" => %{"message" => "Hello, world!"}}
    assert Max2tg.Max.MessageCoding.decode_message(message) == {:opcode_heartbeat, 1, %{"message" => "Hello, world!"}}
  end

  test "encode message" do
    message = {:opcode_heartbeat, 1, %{"message" => "Hello, world!"}}
    assert Max2tg.Max.MessageCoding.encode_message(message) == %{"opcode" => 1, "seq" => 1, "payload" => %{"message" => "Hello, world!"}, "cmd" => 0, "ver" => 11}
  end
end
