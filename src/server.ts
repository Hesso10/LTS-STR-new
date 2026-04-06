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

// Cloud Run Health Check (Google käyttää tätä varmistamaan, että kontti on pystyssä)
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

    // Polku vastausten generointiin
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    console.log(`--- AI Kysely: "${message}" ---`);

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { 
          // KORJAUS: "gemini-3-flash" vaihdettu -> "preview"
          // Tämä käyttää uusinta saatavilla olevaa Gemini-mallia Vertex AI Searchissa
          modelVersion: "preview" 
        },
        promptSpec: {
          preamble: "Olet Hessonpaja-yrityksen asiantuntija-avustaja. Vastaa ystävällisesti ja ammattimaisesti suomeksi annettujen PDF-lähteiden pohjalta. Jos vastausta ei löydy lähteistä, sano se kohteliaasti.",
        },
        includeCitations: true,
      },
    });

    console.log("✅ AI vastaus generoitu onnistuneesti");

    res.json({ 
      text: response.answer?.answerText ||
