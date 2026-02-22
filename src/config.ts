import path from "node:path"
import type Config from "./types/config"

const configPath = process.env.CONFIG_PATH ?? ".."
const file = path.join(configPath, "config.toml")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require(file) as Config

export default config
