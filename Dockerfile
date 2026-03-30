# Vaihe 1: Rakennusvaihe
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Vite builds using the index.html in the root
RUN npm run build

# Vaihe 2: Suoritusvaihe
FROM node:22-slim
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./server.ts

RUN npm install --omit=dev && npm install -g tsx

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["tsx", "server.ts"]
