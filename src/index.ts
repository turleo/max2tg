import config from "./config"
import { nextMessage } from "./flow"
import { MaxWebSocketClient } from "./max"

const max = new MaxWebSocketClient(config, nextMessage)
max.init()
