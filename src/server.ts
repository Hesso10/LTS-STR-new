import express from 'express';
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// --- 1. CONFIGURATION (The Winning Path) ---
const PROJECT_ID = "superb-firefly-489705-g3";
const LOCATION = "eu"; 
const ENGINE_ID = "gemini-enterprise-17730377_1773037734676";

// Initialize the Enterprise Client
const client = new ConversationalSearchServiceClient({
  apiEndpoint: 'eu-discoveryengine.googleapis.com'
});

// --- 2. CHAT ENDPOINT ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // This is the specific Enterprise Serving Config path
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_config`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      answerGenerationSpec: {
        modelSpec: { modelVersion: "stable" },
        promptSpec: { 
          preamble: `
            Olet Hessonpaja-yrityksen asiantuntija-avustaja. 
            SÄÄNNÖT:
            1. Priorisoi AINA vastauksissa PDF-tiedostoja (LTS-ohjeet, Sitra-raportit).
            2. Jos tiedostoissa ja verkossa on ristiriitaa, luota AINA omiin PDF-tiedostoihin.
            3. Vastaa ystävällisesti suomeksi ja viittaa käyttämiisi PDF-lähteisiin.
          ` 
        },
        includeCitations: true
      }
    });

    // Extract the AI's answer
    const replyText = response.answer?.answerText || "Pahoittelut, en löytänyt vastausta strategiapapereista.";
    
    res.json({ text: replyText });

  } catch (err: any) {
    console.error("ENTERPRISE API ERROR:", err.message);
    res.status(500).json({ error: "Virhe: " + err.message });
  }
});

// --- 3. SERVE FRONTEND ---
// This ensures your professional React UI from the 'dist' folder is shown
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- 4. START SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Hessonpaja Enterprise AI Live on Port ${PORT}`);
  console.log(`📍 Region: ${LOCATION} | Engine: ${ENGINE_ID}`);
});
