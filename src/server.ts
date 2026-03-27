import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Ladataan ympäristömuuttujat .env-tiedostosta (paikallista ajoa varten)
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || '8080';

  // --- MIDDLEWARE ---
  app.use(express.json());

  // --- GEMINI AI ALUSTUS ---
  // Varmista, että olet lisännyt GOOGLE_API_KEY Cloud Runin asetuksiin!
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

  // --- AI CHAT ENDPOINT ---
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      // Alustetaan malli ja ohjeistus
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction || "Olet avulias assistentti."
      });

      // Muunnetaan keskusteluhistoria uuden SDK:n muotoon
      // (role 'assistant' muuttuu muotoon 'model')
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts
      }));

      // Haetaan viimeisin viesti
      const lastMessage = messages[messages.length - 1];
      const userText = lastMessage.parts[0].text;

      // Asetetaan Headerit striimausta varten
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      // Käynnistetään chatti historialla ja lähetetään viesti striiminä
      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(userText);

      // Luetaan striimi ja kirjoitetaan se suoraan vastaukseen
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(chunkText);
      }

      res.end();

    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "AI-yhteysvirhe.", 
          details: error.message 
        });
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

    // Kaikki muut reitit ohjataan Reactin index.html:ään
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.warn(`⚠️ Warning: 'dist' folder not found at ${distPath}.`);
    app.get('*', (req, res) => {
      res.status(404).send("Frontend build missing. Muista ajaa npm run build.");
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
