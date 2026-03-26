import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || '8080';

  // --- MIDDLEWARE ---
  app.use(express.json()); // Allows the server to read JSON sent from your React app

  // --- 1. SECURE AI ROUTE (Proxy) ---
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "No message provided" });
      }

      // Securely calling Gemini from the backend
      const result = await model.generateContent(message);
      const response = await result.response;
      const text = response.text();

      // Send the response back to your React frontend
      res.json({ reply: text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "AI failed to respond. Check if GEMINI_API_KEY is set in Cloud Run." });
    }
  });

  // --- 2. STATIC FILE SERVING (The logic that fixed your 404) ---
  const root = process.cwd(); 
  const distPath = path.resolve(root, 'dist');

  if (fs.existsSync(distPath)) {
    console.log(`✅ Production: Serving static files from ${distPath}`);
    app.use(express.static(distPath));

    // Handle SPA routing (React/Vite)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.error(`❌ Critical Error: 'dist' folder not found at ${distPath}`);
    app.get('*', (req, res) => {
      res.status(404).send("Frontend build files missing. Check Cloud Build logs.");
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

startServer().catch(console.error);
