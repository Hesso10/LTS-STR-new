import express from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '8080', 10);

  app.use(express.json());

  // --- API Routes ---
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      // 1. Use Gemini API Key if present
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-1.5-pro', // Updated to a standard stable model name
          contents: messages,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          }
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(chunk.text);
          }
        }
      } 
      // 2. Fallback to Vertex AI (IAM-based)
      else {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_REGION || 'europe-north1';
        
        if (!project) {
          throw new Error("Missing GOOGLE_CLOUD_PROJECT environment variable.");
        }

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
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.end();
      }
    }
  });

  // --- Static File Serving & Environment Logic ---
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development Mode: Dynamic Import of Vite to prevent Production crashes
    console.log('Detected Development Mode. Loading Vite...');
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Failed to load Vite. Ensure vite is installed in devDependencies.', err);
    }
  } else {
    // Production Mode: Serve the pre-built 'dist' folder
    // Note: Since server.ts is in /src, we go up one level to find /dist
    const distPath = path.resolve(__dirname, '..', 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    
    // SPA Fallback: Serve index.html for any route not caught by API or static files
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${PORT} (Mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Critical Server Startup Error:', err);
  process.exit(1);
});
