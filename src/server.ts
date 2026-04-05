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
// TÄRKEÄÄ: Päivitetty vastaamaan Apps-sivulta löytynyttä ID:tä
const ENGINE_ID = "lts-str-toimii_1775296715292";

// Alustetaan Auth-asiakas (Widgetin tukea varten)
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
// Käytetään jos tarvitaan <gen-search-widget> palikkaa
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
// Tämä yhdistää React-sovelluksesi Vertex AI:hin
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId; // Pitää keskustelulangan elossa

    if (!message) return res.status(400).json({ error: "Missing message" });

    // REITTI: Nyt polku käyttää oikeaa ENGINE_ID:tä
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_config`;

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
      sessionId: response.session?.name // Palautetaan sessio-ID frontendiin
    });

  } catch (err: any) {
    console.error("AI SEARCH API ERROR:", err.message);
    res.status(500).json({ error: "Yhteys AI-palveluun epäonnistui." });
  }
});

// --- 4. SERVE FRONTEND ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// SPA Support: Ohjataan kaikki muu liikenne Reactin index.html:ään
app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({error: "Not found"});
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 5. START SERVER ---
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hessonpaja AI Backend running on port ${PORT}`);
  console.log(`Targeting Engine: ${ENGINE_ID} in ${LOCATION}`);
});
