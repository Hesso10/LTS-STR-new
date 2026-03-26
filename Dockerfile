# Vaihe 1: Rakennusvaihe (Build)
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Vaihe 2: Suoritusvaihe (Production)
FROM node:22-slim
WORKDIR /app

# 1. Kopioidaan buildattu frontend (Vite tuottaa tämän /app/dist kansioon)
COPY --from=build /app/dist ./dist

# 2. Kopioidaan package-tiedostot riippuvuuksien asennusta varten
COPY --from=build /app/package*.json ./

# 3. Kopioidaan server.ts suoraan juureen (/app/server.ts)
# Tämä helpottaa polkujen hallintaa, jotta 'dist' löytyy helposti
COPY --from=build /app/src/server.ts ./server.ts

# 4. Asennetaan vain tuotantoriippuvuudet ja työkalu TypeScriptin ajoon
RUN npm install --omit=dev && npm install -g tsx

# Ympäristömuuttujat Cloud Runia varten
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# 5. Käynnistetään palvelin suoraan tsx-komennolla
# Koska server.ts on nyt juuressa, polku on yksinkertainen
CMD ["tsx", "server.ts"]
