import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import dotenv from 'dotenv';

// Load environment variables for local development
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- CONFIGURATION ---
// These are hardcoded based on your specific Google Cloud environment
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "eu"; 
const DATA_STORE_ID = "hessonpajayritysnro1_1773038098495";
const SERVING_CONFIG_ID = "default_config";

// --- INITIALIZE DISCOVERY ENGINE (ENTERPRISE) ---
// We target the 'eu' endpoint because your Search App is EU-based
const client = new ConversationalSearchServiceClient({
  apiEndpoint: 'eu-discoveryengine.googleapis.com'
});

app.use(express.json());

// --- AI CHAT ENDPOINT ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, portalType, sections } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Fully qualified path to your bucket-connected data store
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/servingConfigs/${SERVING_CONFIG_ID}`;

    const request = {
      servingConfig,
      query: { text: message },
      // SummarySpec triggers the "Blended Summary" logic using your PDFs
      summarySpec: {
        summaryResultCount: 5,
        includeCitations: true,
        modelPromptSpec: {
          preamble: `Toimi asiantuntijana ${portalType}-portaalissa. Aihealueet: ${sections?.join(', ') || 'Yleinen'}. Vastaa suomeksi käyttäen annettua aineistoa.`
        },
        modelSpec: {
          version: "stable"
        }
      }
    };

    console.log(`Querying Enterprise Search: ${DATA_STORE_ID} in ${LOCATION}...`);

    const [response] = await client.converseConversation(request);

    // Extract the AI response generated from your PDFs
    const replyText = response.reply?.summary?.summaryText || "Pahoittelut, en löytänyt vastausta arkistoista.";
    
    // Optional: Extract citations if you want to show which PDF was used
    const references = response.reply?.summary?.summaryWithMetadata?.references || [];

    res.json({ 
      text: replyText,
      citations: references 
    });

  } catch (error: any) {
    console.error("Discovery Engine Error:", error);
    
    // Handle 404/403 specifically for the user
    if (error.code === 5 || error.message?.includes('404')) {
      return res.status(404).json({ error: "Data Storea ei löytynyt. Tarkista ID ja Region." });
    }

    res.status(500).json({ error: "Virhe yhdistettäessä yrityshakuun." });
  }
});

// --- SERVE FRONTEND ---
// Ensure your Cloud Build puts the build files in the 'dist' folder
app.use(
