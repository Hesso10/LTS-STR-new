// src/server.ts
import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 

const client = new ConversationalSearchServiceClient();

app.post("/api/chat", async (req, res) => {
  try {
    let { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    // Varmistetaan että cleanMsg on merkkijono ja trimattu
    const cleanMsg = String(message).toUpperCase().trim();

    // 1. SOSIAALINEN SUODATIN (Korjattu ja varmistettu logiikka)
    const socialKeywords = ["KIITOS", "KIITOKSIA", "MOI", "HEI", "TERVE", "LOISTAVAA", "KIITTI"];
    const isSocial = socialKeywords.some(word => cleanMsg.startsWith(word));

    if (isSocial && cleanMsg.length < 20 && !cleanMsg.includes("LTS") && !cleanMsg.includes("STR")) {
      return res.json({
        text: "Kiitos, mukava kuulla että vastauksesta oli apua! Mistä kohdasta haluaisit jatkaa strategiatyötä?",
        sessionId: sessionId 
      });
    }

    // 2. HAKUKYNNYS (Threshold)
    const isDefinition = cleanMsg.includes("MIKÄ") || cleanMsg.includes("MITÄ") || cleanMsg.length < 25;
    const searchThreshold = (cleanMsg.includes("LTS") || cleanMsg.includes("STR") || isDefinition) ? 0.005 : 0.05;

    // 3. PREAMBLE
    const preamble = `Olet asiantunteva suomalainen liiketoimintakonsultti. Tyylisi on analyyttinen ja asiallinen. Jos vastaus ei löydy Data Storesta, käytä Google Searchia. Älä sano "Yhteenvetoa ei voitu luoda".`;

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
        googleSearchSpec: {
          dynamicRetrievalConfig: { predictor: { threshold: searchThreshold } } 
        }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Portaalin ohjeista ei löytynyt suoraa vastausta, mutta strategisessa mielessä tätä kannattaa pohtia näin...",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("Vertex AI Error:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

// STAATTISET TIEDOSTOT (Varmistettu reititys)
const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send("Palvelin on käynnissä. (Käyttöliittymää ladataan)");
    }
  }
});

// PORTTI (Yksinkertaistettu Cloud Runia varten)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
