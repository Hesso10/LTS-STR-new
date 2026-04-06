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

// --- 1. CONFIGURATION ---
const PROJECT_ID = process.env.PROJECT_ID || "superb-firefly-489705-g3";
const LOCATION = process.env.LOCATION || "eu"; 
const ENGINE_ID = process.env.ENGINE_ID || "lts-str-toimii_1775296715292";

// Alustetaan Google Auth
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Alustetaan Vertex AI Client
const client = new ConversationalSearchServiceClient({
  apiEndpoint: "eu-discoveryengine.googleapis.com",
});

// Cloud Run Health Check
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// --- 2. TOKEN ENDPOINT ---
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

// --- 3. CHAT ENDPOINT ---
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId; 

    if (!message) return res.status(400).json({ error: "Missing message" });

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { modelVersion: "gemini-3-flash" },
        promptSpec: {
          preamble: "Olet Hessonpaja-yrityksen asiantuntija-avustaja. Vastaa ystävällisesti suomeksi PDF-lähteiden pohjalta.",
        },
        includeCitations: true,
      },
    });

    res.json({ 
      text: response.answer?.answerText || "En löytänyt vastausta dokumenteista.",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("AI Error:", err.message);
    res.status(500).json({ error: "AI error", details: err.message });
  }
});

// --- 4. STATIC FILES ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).send("Not found");
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 5. START ---
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server on port ${PORT}`);
});
