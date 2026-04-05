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
const PROJECT_ID = "superb-firefly-489705-g3";
const LOCATION = "eu"; 
const DATA_STORE_ID = "hessonpajayritysnro1_1773038098495";

// Initialize the Auth client for the Token Handshake (Widget support)
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Initialize the Discovery Client pointing to the EU endpoint
const client = new ConversationalSearchServiceClient({
  apiEndpoint: "eu-discoveryengine.googleapis.com",
});

// Health check for Cloud Run
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// --- 2. TOKEN HANDSHAKE ENDPOINT ---
// Use this if you decide to use the <gen-search-widget>
app.get("/api/vertex-token", async (_req, res) => {
  try {
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    
    console.log("Successfully generated Vertex AI Access Token");
    
    res.json({ 
      token: tokenResponse.token,
      project: PROJECT_ID 
    });
  } catch (error: any) {
    console.error("TOKEN GENERATION ERROR:", error.message);
    res.status(500).json({ error: "Failed to generate auth token" });
  }
});

// --- 3. CUSTOM CHAT ENDPOINT ---
// This connects your React chat bubbles to the AI
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId; // Optional: keeps conversation thread alive

    if (!message) return res.status(400).json({ error: "Missing message" });

    // CRITICAL: The path must use 'engines' for the Conversational API
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${DATA_STORE_ID}/servingConfigs/default_config`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { modelVersion: "stable" },
        promptSpec: {
          preamble: "Olet Hessonpaja-yrityksen asiantuntija-avustaja. Vastaa ystävällisesti ja ammattimaisesti suomeksi annettujen PDF-lähteiden pohjalta. Jos vastausta ei löydy lähteistä, sano se kohteliaasti.",
        },
        includeCitations: true,
      },
    });

    res.json({ 
      text: response.answer?.answerText || "Pahoittelut, en löytänyt vastausta kysymykseesi dokumenteista.",
      sessionId: response.session?.name // Return this to the frontend to continue the thread
    });

  } catch (err: any) {
    console.error("AI SEARCH API ERROR:", err.message);
    res.status(500).json({ error: "Yhteys AI-palveluun epäonnistui." });
  }
});

// --- 4. SERVE FRONTEND ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// SPA Support: Redirect all other traffic to React index.html
app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({error: "Not found"});
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 5. START SERVER ---
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hessonpaja AI Backend running on port ${PORT}`);
  console.log(`Targeting Data Store: ${DATA_STORE_ID} in ${LOCATION}`);
});
