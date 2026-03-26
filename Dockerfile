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

# Kopioidaan vain tarvittavat tiedostot tuotantoon koon minimoimiseksi
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./

# Asennetaan vain tuotantoriippuvuudet ja tsx palvelimen ajoa varten
RUN npm install --omit=dev && npm install -g tsx

# Cloud Run vaatii portin 8080
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Käynnistetään palvelin
CMD ["npm", "start"]
