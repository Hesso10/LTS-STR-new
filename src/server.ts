import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Ladataan ympäristömuuttujat .env-tiedostosta paikallista kehitystä varten
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || '8080';

  // --- MIDDLEWARE ---
  app.use(express.json());

  // --- VERTEX AI (ENTERPRISE) ALUSTUS ---
  // Käytetään us-central1 aluetta, koska se on vakain Geminille
  const project = process.env.GOOGLE_CLOUD_PROJECT || 'superb-firefly-489705-g3';
  const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

  const vertexAI = new VertexAI({
    project: project,
    location: location
  });

  // --- AI CHAT ENDPOINT ---
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      // VALITAAN TARKKA MALLI-ID (Tämä korjaa 404-virheen Vertex AI:ssa)
      const model = vertexAI.getGenerativeModel({
        model: 'gemini-1.5-flash-002', 
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction || "Olet avulias assistentti." }]
        }
      });

      // Muotoillaan keskusteluhistoria Vertex AI -yhteensopivaksi
      // Otetaan kaikki paitsi viimeinen viesti historiaksi
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role,
        parts: m.parts
      }));

      // Viimeisin käyttäjän viesti (aina listan viimeinen)
      const userMessage = messages[messages.length -
