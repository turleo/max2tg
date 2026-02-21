FROM oven/bun:alpine

WORKDIR /code
COPY package.json bun.lock .
COPY patches/ patches/
RUN bun install --frozen-lockfile --production
COPY src/ src/
CMD ["bun", "run", "run"]
