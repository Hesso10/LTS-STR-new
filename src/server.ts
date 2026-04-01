import express from "express";
// FIX: Use v1 to avoid ESM SyntaxError
import { v1 } from "@google-cloud/discoveryengine"; 
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// --- 1. CONFIGURATION ---
const PROJECT_ID = "superb-firefly-489705-g3";
const LOCATION = "eu";
const DATA_STORE_ID = "gemini-enterprise-17730377_1773037734676";

// FIX: Instantiate from v1
const client = new v1.ConversationalSearchServiceClient({
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
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --- 4. START SERVER ---
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hessonpaja AI Live on 0.0.0.0:${PORT}`);
});