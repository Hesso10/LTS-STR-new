import express from "express";
// FIX: Use v1 to avoid ESM SyntaxError
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
const LOCATION = "eu";
const DATA_STORE_ID = "hessonpajayritysnro1_1773038098495";

// FIX: Instantiate from v1
const client = new ConversationalSearchServiceClient({
  apiEndpoint: "eu-discoveryengine.googleapis.com",
});

// Optional: health endpoint
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// --- 2. CHAT ENDPOINT ---
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) {
      return res.status(400).json({ error: "Missing 'message' in request body" });
    }

    const servingConfig =
      `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/` +
      `dataStores/${DATA_STORE_ID}/servingConfigs/default_config`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      answerGenerationSpec: {
        modelSpec: { modelVersion: "stable" },
        promptSpec: {
          preamble:
            "Olet Hessonpaja-yrityksen asiantuntija-avustaja. Vastaa ystävällisesti suomeksi PDF-lähteiden pohjalta.",
        },
        includeCitations: true,
      },
    });

    res.json({
      text: response.answer?.answerText || "Pahoittelut, en löytänyt vastausta.",
    });
  } catch (err: any) {
    console.error("API ERROR:", err?.message || err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// --- 3. SERVE FRONTEND ---
// Use process.cwd() to reliably point to the project root,
// bypassing __dirname / import.meta.url build conflicts in CommonJS vs ESM.
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// Return 404 for unmatched /api requests so they don't accidentally return index.html
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Serve React frontend for all other fallback routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 4. START SERVER ---
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hessonpaja AI Live on 0.0.0.0:${PORT}`);
});