# --- STAGE 1: Build Stage ---
FROM node:22-slim AS build
WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
RUN npm install

# 2. Copy project files
COPY . .

# 3. Build the React frontend
RUN npm run build

# --- STAGE 2: Production Stage ---
FROM node:22-slim
WORKDIR /app

# 4. Copy the compiled frontend
COPY --from=build /app/dist ./dist

# 5. Copy source and package files
# We need the 'src' folder for server.ts and imports
COPY --from=build /app/package*.json ./
COPY --from=build /app/src ./src

# 6. Install production dependencies + tsx and typescript
# tsx requires typescript to be present to execute .ts files
RUN npm install --omit=dev && npm install -g tsx typescript

# 7. Set Environment Variables
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# 8. Start the server using the relative path from the app root
CMD ["tsx", "src/server.ts"]
