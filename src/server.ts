import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Ladataan ympäristömuuttujat .env tiedostosta (paikallinen kehitys)
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || '8080';

  // --- MIDDLEWARE ---
  app.use(express.json());

  // --- VERTEX AI (ENTERPRISE) ALUSTUS ---
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'superb-firefly-489705-g3',
    location: process.env.GOOGLE_CLOUD_REGION || 'europe-north1'
  });

  // --- AI CHAT ENDPOINT ---
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      // Valitaan malli ja annetaan sille Enterprise-tason ohjeet
      const model = vertexAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }]
        }
      });

      // Muotoillaan keskusteluhistoria (kaikki paitsi viimeisin viesti)
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role,
        parts: m.parts
      }));

      // Viimeisin käyttäjän viesti
      const userMessage = messages[messages.length - 1].parts[0].text;

      // Asetetaan Headerit striimausta varten (HTTP Chunked Transfer)
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      const chat = model.startChat({ history });
      const streamResult = await chat.sendMessageStream(userMessage);

      // Luetaan striimia ja lähetetään palat suoraan frontendille
      for await (const item of streamResult.stream) {
        if (item.candidates && item.candidates[0].content.parts[0].text) {
          const chunk = item.candidates[0].content.parts[0].text;
          res.write(chunk);
        }
      }

      res.end(); // Viimeistellään vastaus

    } catch (error) {
      console.error("Vertex AI Error:", error);
      if (!res.headersSent) {
        res.status(500).send("Tekoälypalveluun ei saatu yhteyttä.");
      } else {
        res.end();
      }
    }
  });

  // --- STAATTISTEN TIEDOSTOJEN TARJOILU (FRONTEND) ---
  const root = process.cwd(); 
  const distPath = path.resolve(root, 'dist');

  if (fs.existsSync(distPath)) {
    console.log(`✅ Production: Serving static files from ${distPath}`);
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.warn(`⚠️ Warning: 'dist' folder not found at ${distPath}. Run 'npm run build' first.`);
    app.get('*', (req, res) => {
      res.status(404).send("Frontend build missing. Please build the project.");
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
