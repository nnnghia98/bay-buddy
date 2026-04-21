FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
COPY apps/web/package.json apps/web/yarn.lock ./apps/web/

RUN yarn install --frozen-lockfile
RUN cd apps/web && yarn install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json yarn.lock ./
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:6768/api/v1
ARG INTERNAL_API_BASE_URL=http://api:6768/api/v1

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV INTERNAL_API_BASE_URL=$INTERNAL_API_BASE_URL

WORKDIR /app/apps/web
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=6769
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 6769

CMD ["node", "apps/web/server.js"]
