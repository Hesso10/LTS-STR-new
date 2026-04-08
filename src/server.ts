import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

/**
 * HUOM: POISTETTU process.env.GOOGLE_APPLICATION_CREDENTIALS -rivi.
 * Cloud Run käyttää automaattisesti sille annettua Service Account -roolia (Discovery Engine Viewer).
 */

const app = express();
app.use(cors());
app.use(express.json());

const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 

const client = new ConversationalSearchServiceClient();

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const messageUpper = message.toUpperCase();
    const isTechnical = messageUpper.startsWith("LTS-") || messageUpper.startsWith("STR-");
    
    // Moodi A (Tekninen PDF) vs Moodi B (Konsultti + Google Search)
    const preamble = isTechnical 
      ? "Olet tekninen avustaja. Vastaa PDF-dokumenttien pohjalta lyhyesti ja ytimekkäästi." 
      : "Olet liiketoimintakonsultti. Yhdistä PDF-tiedot ja Google-haun ajankohtaiset tiedot (kuten verot ja TyEL).";

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { modelVersion: "gemini-1.5-pro/answer_gen/v1" },
        promptSpec: { preamble: preamble + " Vastaa suomeksi. Lopeta kysymykseen: Haluatko syventää tätä?" },
        includeCitations: true,
      },
      contentSearchSpec: {
        summaryResultCount: 3,
        // TÄMÄ ON SE "REMAINING 50%": Aktivoi Google Search -ikkunan Standard-mallissa
        googleSearchSpec: {
          dynamicRetrievalConfig: {
            predictor: {
              threshold: isTechnical ? 0.9 : 0.15 // Konsulttimoodissa käytetään Googlea herkemmin
            }
          }
        }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Vastausta ei löytynyt.",
      sessionId: response.session?.name 
    });
  } catch (err: any) {
    // Logataan tarkka virhe palvelimen lokiin, mutta palautetaan selkeä virhe käyttäjälle
    console.error("Vertex AI Details:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

// Serve Vite build
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, "index.html"));
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hessonpaja Intelligence (Standard Edition) running on port ${PORT}`);
});
