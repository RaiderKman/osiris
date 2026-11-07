FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Node resolves DNS on its libuv pool, four threads by default. The page-load
# burst of feed requests queued the basemap's lookups behind it until they hit
# the 10 s connect timeout, and the map stayed blank until a reload. An .env
# or compose value still overrides this.
ENV UV_THREADPOOL_SIZE=64

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="127.0.0.1"

# The supported listener is `npm start` in a checkout (tools/local-server.mjs).
# This image does not boot an unauthenticated public server.
CMD ["node", "-e", "console.error('Use npm start from a local checkout. This image is not a public server.'); process.exit(1)"]
