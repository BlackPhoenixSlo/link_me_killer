FROM node:22-alpine
WORKDIR /app
# Install runtime deps (hono, @hono/node-server, sharp). sharp pulls prebuilt musl binaries.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
# import-v1 (the v1 Import) is on PATH for `docker compose run app import-v1 ...`.
ENV PATH=/app/bin:$PATH
EXPOSE 3000
CMD ["node", "server.js"]
