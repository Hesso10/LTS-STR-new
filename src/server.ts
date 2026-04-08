import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { GoogleAuth } from 'google-auth-library';
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- VERIFIED 2026 CONFIGURATION ---
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; // Your new Standard App ID
const DATA_STORE_ID = "lts-str-dataa_1775466924921_gcs_store";

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const client = new ConversationalSearchServiceClient({
  apiEndpoint: "discoveryengine.googleapis.com",
});

// Endpoint for your HTML widget to get a secure token
app.get("/api/vertex-token", async (_req, res) => {
  try {
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    res.json({ token: tokenResponse.token, project: PROJECT_ID });
  } catch (error: any) {
    res.status(500).json({ error: "Auth failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId; 

    if (!message) return res.status(400).json({ error: "Missing message" });

    const messageUpper = message.toUpperCase();
    let finalPreamble = "";
    let useGoogleSearchThreshold = 0.3;

    // --- LOGIIKKA: MOODI A (PDF) VS. MOODI B (KONSULTTI) ---
    if (messageUpper.startsWith("LTS-") || messageUpper.startsWith("STR-")) {
      const file = messageUpper.startsWith("LTS-") ? "LTS LIIKETOIMINTASUUNNITELMA" : "STRATEGIA";
      finalPreamble = `Olet tekninen avustaja. Anna tarkkoja ohjeita dokumentista '${file}'. Pysy tiukasti tekstissä. Lopeta aina kysymykseen: "Haluatko syventää tätä ja oppia, miten erotutaan kilpailijoista?"`;
    } else {
      finalPreamble = `Olet kokenut liiketoimintakonsultti. Yhdistä PDF-faktat ja netin tiedot (kuten verot ja TyEL). Ole ytimekäs (max 5 bulletia). Lopeta aina kysymykseen: "Haluatko syventää tätä?"`;
      useGoogleSearchThreshold = 0.15; 
    }

    // Correct path for Standard App using default_search
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      // Session handling for continuous chat
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { modelVersion: "gemini-1.5-pro/answer_gen/v1" },
        promptSpec: { preamble: finalPreamble + " Vastaa suomeksi." },
        includeCitations: true,
      },
      contentSearchSpec: {
        summaryResultCount: 3,
        googleSearchSpec: {
          dynamicRetrievalConfig: { predictor: { threshold: useGoogleSearchThreshold } }
        }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Vastausta ei löytynyt.",
      sessionId: response.session?.name,
      citations: response.answer?.citations || [] 
    });

  } catch (err: any) {
    console.error("❌ BACKEND ERROR:", err.message);
    res.status(500).json({ error: "AI-yhteysvirhe" });
  }
});

// Serve the React app
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).send("Not found");
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hessonpaja Intelligence Running\nProject: ${PROJECT_ID}\nApp: ${ENGINE_ID}`);
});
