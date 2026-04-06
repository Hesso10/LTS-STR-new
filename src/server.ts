import express from 'express';
import cors from 'cors';
import { DiscoveryEngineServiceClient } from '@google-cloud/discoveryengine';

const app = express();
app.use(cors());
app.use(express.json());

// --- PÄIVITETYT ASETUKSET ---
const client = new DiscoveryEngineServiceClient();
const PROJECT_ID = "16978149266";
const LOCATION = "global"; // Varmistettu globaali sijainti
const ENGINE_ID = "lts-str_1775467703431"; // Uusi Engine ID
// ----------------------------

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      answerConfig: {
        answerGenerationSpec: {
          modelSpec: { modelVariant: 'LONG_EXPECTATION' },
          promptSpec: { preamble: 'Olet asiantunteva avustaja. Vastaa suomeksi annettujen dokumenttien ja Google-haun perusteella.' },
          includeCitations: true,
        },
      },
      query: { text: message },
      servingConfig: parent,
      // Tämä aktivoi Google-haun PDF-tiedostojen rinnalle
      contentSearchSpec: {
        extractiveContentSpec: { maxNextTokenCount: 1000 },
        googleSearchSpec: {} 
      }
    });

    res.json({ answer: response.answer?.answerText || "Pahoittelut, en löytänyt vastausta." });
  } catch (error: any) {
    console.error("Vertex AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
