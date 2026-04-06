import express from "express";
import cors from "cors";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";

const app = express();
app.use(cors());
app.use(express.json());

// --- KONFIGURAATIO (GLOBAL AREA) ---
const PROJECT_ID = "superb-firefly-489705-g3";
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775463023606";

// Discovery Engine Client - HUOM: Ei eu-etuliitettä endpointissa
const client = new ConversationalSearchServiceClient({
  apiEndpoint: "discoveryengine.googleapis.com",
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId;

    if (!message) {
      return res.status(400).json({ error: "Viesti puuttuu" });
    }

    // Luodaan polku oikeaan hakukoneeseen (Global location)
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    console.log(`--- AI Kysely: "${message}" ---`);

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { 
          modelVersion: "stable" 
        },
        // AKTIVOI GOOGLE-HAUN (Grounding)
        groundingConfig: {
          sources: [{ googleSearchSpec: {} }]
        },
        promptSpec: {
          preamble: "Olet Hessonpaja-avustaja. Vastaa suomeksi yhdistämällä tietoa annetuista verkkosivustoista ja reaaliaikaisesta Google-hausta. Ole asiantunteva ja selkeä.",
        },
        includeCitations: true,
      },
    });

    // Palautetaan vastaus ja istunnon ID (jatkokeskusteluja varten)
    res.json({ 
      text: response.answer?.answerText || "En löytänyt vastausta kysymykseesi.",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("❌ VERTEX AI ERROR:", err);
    res.status(500).json({ 
      error: "AI-yhteysvirhe", 
      details: err.message 
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Hessonpaja-bäkendi rullaa portissa ${PORT}`);
  console.log(`📍 Alue: ${LOCATION}, Engine: ${ENGINE_ID}`);
});
