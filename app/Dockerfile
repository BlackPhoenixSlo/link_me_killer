# Offline build (plan §11): node_modules is copied from app/, no package install.
FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
