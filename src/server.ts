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

// --- CONFIGURATION ---
const PROJECT_ID = "16978149266"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775467703431"; // Advanced Website Engine ID

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const client = new ConversationalSearchServiceClient({
  apiEndpoint: "discoveryengine.googleapis.com",
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.get("/api/vertex-token", async (_req, res) => {
  try {
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    res.json({ token: tokenResponse.token, project: PROJECT_ID });
  } catch (error: any) {
    console.error("Token Error:", error.message);
    res.status(500).json({ error: "Auth failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId; 

    if (!message) return res.status(400).json({ error: "Missing message" });

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    console.log(`--- 🚀 AI Kysely (Yhdistetty PDF + Google Search): "${message}" ---`);

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { 
          modelVersion: "preview" 
        },
        promptSpec: {
          preamble: "Olet Hessonpaja-avustaja. Vastaa suomeksi. Käytä ensisijaisesti PDF-dokumentteja (Bucket). Jos vastausta ei löydy niistä (esim. sää tai yleinen tieto), käytä Google-hakua vastauksen muodostamiseen.",
        },
        includeCitations: true,
      },
      // TÄMÄ ON SE RATKAISEVA OSA: Aktivoi Google Search Groundingin
      contentSearchSpec: {
        extractiveContentSpec: { 
          maxNextTokenCount: 1000 
        },
        snippetSpec: {
          maxSnippetCount: 5
        },
        googleSearchSpec: {
          dynamicRetrievalConfig: {
            predictor: {
              // Threshold 0.1 pakottaa mallin käyttämään Google-hakua erittäin herkästi
              threshold: 0.1 
            }
          }
        }
      }
    });

    const answerText = response.answer?.answerText || "En löytänyt vastausta lähteistäni.";

    res.json({ 
      text: answerText,
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("❌ BACKEND ERROR:", err.message);
    res.status(500).json({ 
      error: "AI-yhteysvirhe", 
      details: err.message 
    });
  }
});

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).send("Not found");
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hessonpaja Master (Grounding Enabled) running on port ${PORT}`);
});
