# Vaihe 1: Rakennusvaihe
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Vaihe 2: Suoritusvaihe
FROM node:22-slim
WORKDIR /app

# Kopioidaan buildattu frontend
COPY --from=build /app/dist ./dist
# Kopioidaan package-tiedostot
COPY --from=build /app/package*.json ./
# Kopioidaan uusi server.ts
COPY --from=build /app/server.ts ./server.ts

# Asennetaan tuotantoriippuvuudet ja tsx
RUN npm install --omit=dev && npm install -g tsx

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Käynnistetään uusi Enterprise-palvelin
CMD ["tsx", "server.ts"]
