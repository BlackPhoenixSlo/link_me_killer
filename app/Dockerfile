# Offline build (plan §11): node_modules is copied from app/, no package install.
FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production
# import-v1 (the v1 Import) is on PATH for `docker compose run app import-v1 ...`.
ENV PATH=/app/bin:$PATH
EXPOSE 3000
CMD ["node", "server.js"]
