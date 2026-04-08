import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { GoogleAuth } from 'google-auth-library';
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Force the app to use your key file
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), "google-key.json");

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

    // Use Moodi A/B Logic
    const isTechnical = message.toUpperCase().startsWith("LTS-") || message.toUpperCase().startsWith("STR-");
    const preamble = isTechnical 
      ? "Olet tekninen avustaja. Vastaa PDF-dokumenttien pohjalta lyhyesti." 
      : "Olet liiketoimintakonsultti. Yhdistä PDF-tiedot ja yleistieto yrittäjälle.";

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { modelVersion: "gemini-1.5-pro/answer_gen/v1" },
        promptSpec: { preamble: preamble + " Vastaa suomeksi." },
        includeCitations: true,
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Vastausta ei löytynyt.",
      sessionId: response.session?.name 
    });
  } catch (err: any) {
    console.error("Vertex Error:", err.message);
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
app.listen(PORT, () => console.log(`🚀 Hessonpaja running on port ${PORT}`));
