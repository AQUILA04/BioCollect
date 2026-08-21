# Image de production composite : API Express et back-office Vite BioCollect.
FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/form-engine/package.json packages/form-engine/package.json
COPY packages/biometric-sdk-bridge/package.json packages/biometric-sdk-bridge/package.json
COPY packages/i18n/package.json packages/i18n/package.json

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm generate:locales && pnpm --dir apps/api build

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
