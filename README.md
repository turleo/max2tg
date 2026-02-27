# max-forwarder-userbot

Forwards messages from Max to Telegram.

Currently supports forwarding
- [x] Formatting
- [x] Forwards
- [x] Replies
- [x] Photos
- [x] Videos
- [x] Documents
- [x] Video and voice messages
- [x] Locations

## Configuration

```toml
telegramToken = "Bot token"
maxToken = "Token from web ui stored in localstorage by key __oneme_auth"
deviceId = "UUID"

[userAgent]
deviceType = "DESKTOP"
locale = "ru"
deviceLocale = "ru"
osVersion = "Windows"
deviceName = "Chrome"
headerUserAgent = "Mozilla/5.0 ..."
appVersion = "26.2.2"
screen = "1920x1080"

forward = [
  { from = -123, to = { chatId = 123 } },
  { from = 0, to = { chatId = -100123, threadId = 2 } },
]
```

## Run

The image expects `config.toml` in a volume mounted at `/config`:

```bash
docker pull ghcr.io/turleo/max2tg:latest
docker run -v /path/to/config:/config max2tg
```

## Scripts

- `bun run lint` — lint
- `bun run lint:fix` — lint and fix
- `bun run typecheck` — TypeScript check
