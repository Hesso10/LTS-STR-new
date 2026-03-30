# Vaihe 1: Rakennusvaihe (Build Stage)
FROM node:22-slim AS build
WORKDIR /app

# 1. Kopioidaan riippuvuustiedostot
COPY package*.json ./

# 2. Asennetaan kaikki riippuvuudet (myös devDependencies)
RUN npm install

# 3. Kopioidaan koko projektin sisältö
COPY . .

# --- DEBUG: Tulostetaan tiedostolistaus lokiin ---
# Tämän avulla näemme, onko index.html juuressa
RUN ls -la

# 4. Rakennetaan frontend (Vite etsii index.html tiedostoa tässä vaiheessa)
RUN npm run build

# Vaihe 2: Suoritusvaihe (Production Stage)
FROM node:22-slim
WORKDIR /app

# Kopioidaan vain tarvittavat osat edellisestä vaiheesta
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./server.ts

# Asennetaan vain tuotantoriippuvuudet ja tsx-työkalu palvelimen ajoon
RUN npm install --omit=dev && npm install -g tsx

# Ympäristömuuttujat Cloud Runia varten
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Käynnistetään palvelin
CMD ["tsx", "server.ts"]
