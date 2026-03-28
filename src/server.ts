import express from 'express';
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// CONFIGURATION - MUST MATCH YOUR EU SETUP
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "eu"; // Changed from us-central1
const DATA_STORE_ID = "YOUR_DATA_STORE_ID_HERE"; // Find this in Agent Builder > Data Stores

const client = new ConversationalSearchServiceClient({
  apiEndpoint: 'eu-discoveryengine.googleapis.com'
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, portalType, sections } = req.body;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/servingConfigs/default_config`;

    const request = {
      servingConfig,
      query: { text: message },
      // Summary configuration ensures you get the "Blended" result
      summarySpec: {
        summaryResultCount: 5,
        includeCitations: true,
        modelPromptSpec: {
          preamble: `Toimi asiantuntijana ${portalType}-portaalissa. Aihealueet: ${sections.join(', ')}. Vastaa suomeksi.`
        }
      }
    };

    const [response] = await client.converseConversation(request);

    // Get the summary generated from your bucket data
    const aiResponse = response.reply?.summary?.summaryText || "Pahoittelut, en löytänyt tietoa arkistoista.";

    res.json({ text: aiResponse });

  } catch (error: any) {
    console.error("Discovery Engine Error:", error);
    res.status(500).json({ error: "Yhteysvirhe yrityshakuun." });
  }
});

const PORT = process.env.PORT || '8080';
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
