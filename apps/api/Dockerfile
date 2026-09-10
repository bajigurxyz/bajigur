FROM oven/bun:1.4
WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN bun install --production --ignore-scripts

ENV NODE_ENV=production
EXPOSE 3002
CMD ["bun", "run", "apps/api/src/index.ts"]
