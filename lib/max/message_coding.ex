defmodule Max2tg.Max.MessageCoding do
  alias Max2tg.Max.OpcodeAtomMap
  def decode_message(message) do
    atom = OpcodeAtomMap.opcode_to_atom(message["opcode"])
    {atom, message["seq"], message["payload"]}
  end

  def encode_message({atom, seq, payload}) do
    opcode = OpcodeAtomMap.atom_to_opcode(atom)
    %{"opcode" => opcode, "seq" => seq, "cmd" => get_cmd(atom), "payload" => payload, "ver" => 11}
  end

  def get_cmd(atom) when atom == :opcode_incoming_message do
    1
  end
  def get_cmd(_atom) do
    0
  end
end
