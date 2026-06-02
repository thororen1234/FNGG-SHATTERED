FROM node:lts-alpine
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PORT=3000 HOSTNAME="0.0.0.0"
RUN corepack enable

RUN apk update
RUN apk upgrade --no-cache
RUN apk add --no-cache libc6-compat chromium nss freetype harfbuzz ca-certificates ttf-freefont

WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install
COPY . .

RUN pnpm run build

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p /app/uploaded
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]