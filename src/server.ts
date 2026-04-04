import express from "express";
// FIX: Käytetään v1-versiota yhteensopivuuden varmistamiseksi
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine/build/src/v1";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// --- 1. CONFIGURATION ---
const PROJECT_ID = "superb-firefly-489705-g3";
const LOCATION = "eu"; // Data sijaitsee EU-alueella
const DATA_STORE_ID = "hessonpajayritysnro1_1773038098495";

// FIX: Lisätty 'location: "eu"', jotta API löytää Enterprise-lisenssisi oikeasta paikasta
const client = new ConversationalSearchServiceClient({
  apiEndpoint: "eu-discoveryengine.googleapis.com",
  location: LOCATION, 
});

// Terveystarkistus Cloud Runia varten
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// --- 2. CHAT ENDPOINT ---
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) {
      return res.status(400).json({ error: "Missing 'message' in request body" });
    }

    // Rakennetaan poltu oikein
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/servingConfigs/default_config`;

    console.log(`Sending query to Vertex AI: ${message}`);

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      // Enterprise-tason asetukset yhteenvedolle (Blended Search)
      answerGenerationSpec: {
        modelSpec: { modelVersion: "stable" },
        promptSpec: {
          preamble: "Olet Hessonpaja-yrityksen asiantuntija-avustaja. Vastaa ystävällisesti suomeksi PDF-lähteiden pohjalta.",
        },
        includeCitations: true,
      },
    });

    // Palautetaan tekoälyn muodostama vastaus
    res.json({
      text: response.answer?.answerText || "Pahoittelut, en löytänyt vastausta PDF-tiedostoistasi.",
    });

  } catch (err: any) {
    // Logataan tarkka virhe Cloud Runin lokeihin
    console.error("API ERROR DETAILS:", JSON.stringify(err, null, 2));
    res.status(500).json({ 
      error: err?.message || "Internal server error",
      details: "Tarkista Google Cloudin lokit 'gcloud logging read' -komennolla."
    });
  }
});

// --- 3. SERVE FRONTEND ---
// Käytetään process.cwd() jotta dist-kansio löytyy riippumatta build-ympäristöstä
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// API-reittien suojaus
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Kaikki muut pyynnöt ohjataan React-frontendille (SPA-tuki)
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 4. START SERVER ---
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hessonpaja AI Live on port ${PORT}`);
  console.log(`Using Project: ${PROJECT_ID}, Location: ${LOCATION}`);
});
