import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// --- 1. CONFIGURATION ---
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "eu"; // Forcing EU to bypass Finland 404
const DATA_STORE_ID = "hessonpajayritysnro1_1773038098495";

// Initialize Client pointing to the EU Discovery Engine Gateway
const client = new ConversationalSearchServiceClient({
  apiEndpoint: 'eu-discoveryengine.googleapis.com'
});

// --- 2. CHAT ENDPOINT ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/servingConfigs/default_config`;

    const request = {
      servingConfig,
      query: { text: message },
      summarySpec: {
        summaryResultCount: 5,
        includeCitations: true,
        modelSpec: { version: "stable" },
        // --- TEACHING RULES / SYSTEM INSTRUCTIONS ---
        modelPromptSpec: {
          preamble: `
            Olet Hessonpaja-yrityksen asiantuntija-avustaja. 
            SÄÄNNÖT:
            1. Priorisoi AINA vastauksissa Data Storen PDF-tiedostoja (LTS-ohjeet, Sitra-raportit).
            2. Käytä Google-hakua (Web Search) vain täydentävänä tietona.
            3. Jos tiedostoissa ja verkossa on ristiriitaa, luota AINA omiin PDF-tiedostoihin.
            4. Vastaa ystävällisesti suomeksi ja viittaa käyttämiisi PDF-lähteisiin.
          `
        }
      }
    };

    const [response] = await client.converseConversation(request);
    const replyText = response.reply?.summary?.summaryText || "Pahoittelut, en löytänyt vastausta tiedostoistasi.";
    
    res.json({ text: replyText });

  } catch (error: any) {
    console.error("DISCOVERY ENGINE ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- 3. SERVE FRONTEND ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Enterprise Server Live on Port ${PORT} (Region: ${LOCATION})`);
});
