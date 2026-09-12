FROM oven/bun:1.4
WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/mcp ./apps/mcp
RUN bun install --production --ignore-scripts

ENV NODE_ENV=production
EXPOSE 3004
CMD ["bun", "run", "apps/mcp/src/http.ts"]
