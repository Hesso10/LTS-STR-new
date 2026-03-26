import express from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '8080', 10);

  app.use(express.json());

  // --- 1. Your Original API Routes ---
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-1.5-pro',
          contents: messages,
          config: { systemInstruction, temperature: 0.7 }
        });
        for await (const chunk of responseStream) {
          if (chunk.text) res.write(chunk.text);
        }
      } else {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_REGION || 'europe-north1';
        if (!project) throw new Error("Missing GOOGLE_CLOUD_PROJECT");

        const vertexAI = new VertexAI({ project, location });
        const generativeModel = vertexAI.getGenerativeModel({
          model: 'gemini-1.5-pro',
          systemInstruction: systemInstruction,
        });
        const responseStream = await generativeModel.generateContentStream({
          contents: messages,
          generationConfig: { temperature: 0.7 },
        });
        for await (const chunk of responseStream.stream) {
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) res.write(text);
        }
      }
      res.end();
    } catch (error) {
      console.error('Chat API Error:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
      else res.end();
    }
  });

  // --- 2. The New Production Path Logic ---
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Force path to /app/dist regardless of file location
    const distPath = path.resolve(process.cwd(), 'dist');
    
    console.log(`Checking for static files in: ${distPath}`);
    
    // Check if dist folder exists before serving
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error("ERROR: index.html not found at", indexPath);
            res.status(404).send("Frontend files missing. Check Docker build.");
          }
        });
      });
    } else {
      console.error("CRITICAL ERROR: dist folder not found at", distPath);
    }
  } else {
    // --- 3. Your Original Vite Dev Logic ---
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite not found, serving static if possible');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server active on port ${PORT} (Mode: ${process.env.NODE_ENV})`);
  });
}

startServer().catch(console.error);
