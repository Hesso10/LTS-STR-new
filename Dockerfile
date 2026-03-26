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

# Kopioidaan buildattu frontend
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Kopioidaan server.ts src-kansiosta
COPY --from=build /app/src/server.ts ./src/server.ts

# Asennetaan vain tuotantoriippuvuudet
RUN npm install --omit=dev && npm install -g tsx

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Käynnistetään palvelin
CMD ["npm", "start"]
