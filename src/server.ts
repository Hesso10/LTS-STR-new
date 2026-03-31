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

// --- 1. CONFIGURATION ---
const PROJECT_ID = "superb-firefly-489705-g3";
const LOCATION = "eu"; 
const ENGINE_ID = "gemini-enterprise-17730377_1773037734676";
const DATA_STORE_ID = "gemini-enterprise-17730377_1773037734676";

// Initialize with the EU Endpoint
const client = new ConversationalSearchServiceClient({
  apiEndpoint: 'eu-discoveryengine.googleapis.com'
});

// --- 2. CHAT ENDPOINT ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/servingConfigs/default_config`;

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

    const replyText = response.answer?.answerText || "Pahoittelut, en löytänyt vastausta strategiapapereista.";
    res.json({ text: replyText });

  } catch (err: any) {
    console.error("ENTERPRISE API ERROR:", err.message);
    res.status(500).json({ error: "Palvelinvirhe: " + err.message });
  }
});

// --- 3. SERVE FRONTEND ---
// We look for the 'dist' folder created by Vite in the root
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- 4. START SERVER ---
const PORT = process.env.PORT || 8080;

// CRITICAL: Cloud Run requires listening on '0.0.0.0'
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Hessonpaja Enterprise AI Live on Port ${PORT}`);
  console.log(`🔗 Listening on 0.0.0.0 for Cloud Run health checks`);
});
