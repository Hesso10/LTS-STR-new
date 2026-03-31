# --- STAGE 1: Build Stage ---
FROM node:22-slim AS build
WORKDIR /app

# 1. Install dependencies first (for faster caching)
COPY package*.json ./
RUN npm install

# 2. Copy the entire project
COPY . .

# 3. Build the React frontend
# This uses Vite to create the /app/dist folder
RUN npm run build

# --- STAGE 2: Production Stage ---
FROM node:22-slim
WORKDIR /app

# 4. Copy the compiled frontend from the build stage
COPY --from=build /app/dist ./dist

# 5. Copy the source code and package files
# We copy the 'src' folder because 'tsx' needs to read the source server.ts and its imports
COPY --from=build /app/package*.json ./
COPY --from=build /app/src ./src

# 6. Install only production dependencies and the 'tsx' runner
RUN npm install --omit=dev && npm install -g tsx

# 7. Set Environment Variables for Cloud Run
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# 8. Start the server
# We point to 'src/server.ts' because that is where your Express code lives
CMD ["tsx", "src/server.ts"]
