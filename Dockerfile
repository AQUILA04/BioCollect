# Image de production composite : API Express et back-office Vite BioCollect.
FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Bake Manus OAuth portal settings into the Vite SPA at build time.
ARG VITE_OAUTH_PORTAL_URL=
ARG VITE_APP_ID=
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID

COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
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
