FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@9.15.0

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @moderators/database db:generate

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

CMD ["pnpm", "--filter", "api", "start"]
