# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Runtime
FROM node:22-alpine AS runtime
RUN apk add --no-cache curl
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/package.json ./package.json

USER node

EXPOSE 3001

ENTRYPOINT ["node", "dist/main.js"]
