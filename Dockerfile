# --- STAGE 1: Build Stage ---
FROM node:22-slim AS build
WORKDIR /app

# 1. Install all dependencies
COPY package*.json ./
RUN npm install

# 2. Copy project files and build the React frontend
COPY . .
RUN npm run build

# --- STAGE 3: Production Stage ---
FROM node:22-slim
WORKDIR /app

# 3. Copy the compiled frontend from Stage 1
COPY --from=build /app/dist ./dist

# 4. Copy source and package files
COPY --from=build /app/package*.json ./
COPY --from=build /app/src ./src

# 5. Install production dependencies and global TS tools
# We omit dev-deps to keep it slim, but add tsx/typescript for execution
RUN npm install --omit=dev && npm install -g tsx typescript @types/node

# 6. Set Environment Variables
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# 7. Start the server using the internal path
CMD ["npm", "start"]
