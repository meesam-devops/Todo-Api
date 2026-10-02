FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# No dependencies, so there is no `npm install` step. Copy package.json first
# anyway so the layout stays cache-friendly if dependencies are added later.
COPY package.json ./
COPY src ./src

# The official node image ships a non-root `node` user; use it.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
