// src/server.ts
import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

// Ladataan env-muuttujat, mutta Cloud Runissa ne tulevat suoraan ympäristöstä
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Google Cloud Konfiguraatio
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 

// Alustetaan client try-catchin sisällä, jotta kaatuminen ei tapahdu heti käynnistyksessä
let client: any;
try {
    client = new ConversationalSearchServiceClient();
    console.log("✅ Vertex AI Client initialized");
} catch (e) {
    console.error("❌ Failed to initialize Vertex AI Client:", e);
}

// API-REITTI
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();

    // SOSIAALINEN SUODATIN
    const positiveWords = ["kiitos", "kiitokset", "kiitti", "loistavaa", "hienoa", "hyvä", "mahtavaa"];
    const frustrationWords = ["ei toimi", "huono", "en ymmärrä", "vaikeaa", "sekava", "ärsyttävä"];

    if (!msgLower.includes("lts") && !msgLower.includes("str")) {
        if (positiveWords.some(word => msgLower.startsWith(word)) && msgLower.length < 40) {
            return res.json({ text: "Kiitos palautteesta, mukava olla avuksi. Jatketaanpa työstämistä!", sessionId });
        }
        if (frustrationWords.some(word => msgLower.includes(word)) && msgLower.length < 50) {
            return res.json({ text: "Pahoittelut epäselvyydestä. Yritänkö selittää asian toisin?", sessionId });
        }
    }

    const isLawQuery = msgLower.includes("laki") || msgLower.includes("valmistelu") || msgLower.includes("finlex");
    const searchThreshold = (msgLower.includes("lts") || msgLower.includes("str") || isLawQuery) ? 0.001 : 0.05;

    const preamble = `Asiantunteva suomalainen konsultti. Jos vastaus ei löydy Data Storesta, käytä Google Searchia. Ohjaa tarvittaessa Finlexiin tai Hankeikkunaan.`;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        promptSpec: { preamble },
        includeCitations: true,
        answerLanguageCode: "fi",
      },
      contentSearchSpec: {
        summaryResultCount: 5,
        googleSearchSpec: { dynamicRetrievalConfig: { predictor: { threshold: searchThreshold } } }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Strategisesta näkökulmasta tätä kannattaa pohtia näin...",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("Vertex AI Error:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

// STAATTISET TIEDOSTOT
const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
    console.log("📂 Serving static files from:", distPath);
    app.use(express.static(distPath));
}

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // TÄRKEÄÄ: Palautetaan 200 OK, jotta Cloud Runin health check menee läpi
      res.status(200).send("Server is running. Frontend build missing.");
    }
  }
});

// PORTIN KUUNTELU - Cloud Run vaatii Number(process.env.PORT)
const port = Number(process.env.PORT) || 8080;
app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 LTS-STR WebApp listening on port ${port}`);
});
