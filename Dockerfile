# The app as one container: the server serves the built client and the API.
# Build: docker build -t excalidraw-dashboard .
# Run:   mkdir -p data && docker run --init -p 127.0.0.1:3001:3001 -v "$PWD/data:/data" excalidraw-dashboard

FROM node:24-slim AS base
# The pnpm version CI uses.
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS runtime-deps
RUN pnpm install --frozen-lockfile --prod

FROM node:24-slim
ENV NODE_ENV=production \
	PORT=3001 \
	DATA_DIR=/data
WORKDIR /app
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY --from=build /app/dist ./dist
# The database folder is usually a bind mount; the image's own one belongs to
# the node user too, so the container also runs without one.
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
# The slim image has no curl, so Node's fetch checks the API.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["node", "-e", "fetch(`http://localhost:${process.env.PORT}/api/drawings`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/server/index.ts"]
