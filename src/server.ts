import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || '8080';

  // --- 1. Your API Routes (Chat logic goes here) ---
  app.post('/api/chat', async (req, res) => {
    // Your existing OpenAI/Gemini logic
    res.json({ message: "AI response here" });
  });

  // --- 2. Static File Serving (The Fix) ---
  // process.cwd() in Docker is '/app'
  const distPath = path.resolve(process.cwd(), 'dist');

  if (fs.existsSync(distPath)) {
    console.log(`✅ Production: Serving static files from ${distPath}`);
    app.use(express.static(distPath));

    // Support for Single Page Apps (React/Vite routing)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.error(`❌ Critical Error: 'dist' folder not found at ${distPath}`);
    // Fallback so the page isn't just "Cannot GET /"
    app.get('*', (req, res) => {
      res.status(404).send("Frontend build files missing in container.");
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

startServer().catch(console.error);
