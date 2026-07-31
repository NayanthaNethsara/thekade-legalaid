FROM node:22.18.0-alpine AS base

WORKDIR /usr/src/app

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .
RUN pnpm run build

FROM base AS runtime

ENV NODE_ENV=production

RUN addgroup -S app && adduser -S -G app app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

COPY --from=build /usr/src/app/dist ./dist

USER app

EXPOSE 8080

CMD ["node", "dist/main"]