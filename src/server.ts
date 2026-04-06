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
// Varmista, että nämä tiedot ovat täsmälleen oikein Google Cloud -konsolista
const PROJECT_ID = "superb-firefly-489705-g3";
const LOCATION = "eu"; 
const ENGINE_ID = "lts-str-toimii_1775296715292";

// Alustetaan Auth-asiakas
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Alustetaan Discovery-asiakas EU-alueen rajapintaan
const client = new ConversationalSearchServiceClient({
  apiEndpoint: "eu-discoveryengine.googleapis.com",
});

// Cloud Run terveystarkistus
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// --- 2. TOKEN HANDSHAKE ENDPOINT ---
// Käytetään jos tarvitaan <gen-search-widget> palikkaa frontendissä
app.get("/api/vertex-token", async (_req, res) => {
  try {
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    
    console.log("✅ Vertex AI Access Token generated successfully");
    
    res.json({ 
      token: tokenResponse.token,
      project: PROJECT_ID 
    });
  } catch (error: any) {
    console.error("❌ TOKEN GENERATION ERROR:", error.message);
    res.status(500).json({ error: "Failed to generate auth token" });
  }
});

// --- 3. CUSTOM CHAT ENDPOINT ---
// Tämä yhdistää React-sovelluksesi Vertex AI:hin
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId; // Pitää keskustelulangan elossa (esim. projects/.../sessions/123)

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // KORJAUS: Käytetään 'default_search' konfiguraatiota 'default_config' sijaan
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    console.log(`--- Uusi kysymys: "${message}" ---`);

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { 
          // Valittu Gemini 3 Flash nopeuden ja suomen kielen sujuvuuden vuoksi
          modelVersion: "gemini-3-flash" 
        },
        promptSpec: {
          preamble: "Olet Hessonpaja-yrityksen asiantuntija-avustaja. Vastaa ystävällisesti ja ammattimaisesti suomeksi annettujen PDF-lähteiden
