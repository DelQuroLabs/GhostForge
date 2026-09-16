# Ghostforge production image (Coolify / any Docker host).
# Fully self-hosted: the database is a SQLite file and chapter MP3s are plain
# files, both under /app/data. Persist /app/data as a volume or everything is
# lost when the container is replaced. No secrets are baked in: the AI key is
# entered once in the app's Settings page (stored inside the database file).
#
# Optional env vars:
#   GHOSTFORGE_DATA  data directory (default /app/data; normally left alone)
#   GHOSTFORGE_DB    database file path (default <data>/app.db)
#   PORT             HTTP port (default 3000)

FROM node:20-alpine AS build
WORKDIR /app
# Build tools: better-sqlite3 compiles a native module during install.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && apk del python3 make g++
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/prompts ./prompts
VOLUME /app/data
EXPOSE 3000
CMD ["npm", "start"]
