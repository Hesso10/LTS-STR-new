# --- STAGE 1: Build Stage ---
FROM node:22-slim AS build
WORKDIR /app

# 1. Install all dependencies
COPY package*.json ./
RUN npm install

# 2. Copy project files and build the React frontend
COPY . .
RUN npm run build

# --- STAGE 2: Production Stage ---
FROM node:22-slim
WORKDIR /app

# 3. Copy the compiled frontend (the 'dist' folder) from Stage 1
COPY --from=build /app/dist ./dist

# 4. Copy source and package files for the backend
COPY --from=build /app/package*.json ./
COPY --from=build /app/src ./src

# 5. Install ONLY production dependencies to keep the image small
# We add tsx and typescript globally so the "start" command works
RUN npm install --omit=dev && npm install -g tsx typescript @types/node

# 6. Set Environment Variables
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# 7. Start the server
# This runs 'tsx src/server.ts' which looks for the ./dist folder we copied in Step 3
CMD ["npm", "start"]
