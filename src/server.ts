import express from 'express';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '8080', 10);

  app.use(express.json());

  // API Routes
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      // If GEMINI_API_KEY is provided, use the standard Gemini API
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.1-pro-preview',
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
      } else {
        // Otherwise, fallback to Vertex AI (Enterprise SDK) using IAM credentials
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_REGION;
        
        if (!project || !location) {
          throw new Error("Missing GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_REGION environment variables for Vertex AI.");
        }

        const vertexAI = new VertexAI({ project, location });
        const generativeModel = vertexAI.getGenerativeModel({
          model: 'gemini-3.1-pro-preview',
          systemInstruction: systemInstruction,
        });

        const request = {
          contents: messages,
          generationConfig: {
            temperature: 0.7,
          },
        };

        const responseStream = await generativeModel.generateContentStream(request);

        for await (const chunk of responseStream.stream) {
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            res.write(chunk.candidates[0].content.parts[0].text);
          }
        }
      }
      
      res.end();
    } catch (error) {
      console.error('Chat API Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate response' });
      } else {
        res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
