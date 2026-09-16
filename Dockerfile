# Ghostforge production image (Coolify / any Docker host).
# Build stage compiles the client (vite) and the server (tsc); the run stage
# ships only production dependencies + build output. No secrets are baked in:
# configure SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_AUDIO_BUCKET
# as environment variables on the host (Coolify: Environment Variables).

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/prompts ./prompts
EXPOSE 3000
CMD ["npm", "start"]
