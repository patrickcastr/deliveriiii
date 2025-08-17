FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY . .
RUN pnpm i --frozen-lockfile || pnpm i
RUN pnpm build
EXPOSE 5173
CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "5173"]
