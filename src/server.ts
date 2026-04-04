import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine/build/src/v1";
import { GoogleAuth } from 'google-auth-library'; // Added for the Handshake
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

// Initialize the Auth client for the Token Handshake
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Initialize the Discovery Client (Your existing setup)
const client = new ConversationalSearchServiceClient({
  apiEndpoint: "eu-discoveryengine.googleapis.com",
  location: LOCATION, 
});

// Terveystarkistus Cloud Runia varten
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// --- 2. NEW: TOKEN HANDSHAKE ENDPOINT ---
// This unlocks the <gen-search-widget> in your frontend
app.get("/api/vertex-token", async (_req, res) => {
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    
    // Log for debugging in Cloud Run console
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

// --- 3. EXISTING CHAT ENDPOINT (Keep as backup) ---
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) return res.status(400).json({ error: "Missing message" });

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/servingConfigs/default_config`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      answerGenerationSpec: {
        modelSpec: { modelVersion: "stable" },
        promptSpec: {
          preamble: "Olet Hessonpaja-yrityksen asiantuntija-avustaja. Vastaa ystävällisesti suomeksi PDF-lähteiden pohjalta.",
        },
        includeCitations: true,
      },
    });

    res.json({ text: response.answer?.answerText || "En löytänyt vastausta." });
  } catch (err: any) {
    console.error("API ERROR:", err.message);
    res.status(500).json({ error: err?.message });
  }
});

// --- 4. SERVE FRONTEND ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// Protected API routes check
app.use("/api/healthz", (_req, res) => res.sendStatus(200));

// SPA Support: Redirect all other traffic to React index.html
app.get("*", (req, res) => {
  // Prevent infinite loops if the file doesn't exist
  if (req.path.startsWith('/api')) return res.status(404).json({error: "Not found"});
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 5. START SERVER ---
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hessonpaja AI Live on port ${PORT}`);
  console.log(`Project: ${PROJECT_ID} | Auth Scopes: Cloud-Platform`);
});
