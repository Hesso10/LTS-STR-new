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

// Globaali muuttuja context-lockia varten
let lastContextTopic = "";

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();

    // 1. LAAJENNETTU MYÖNTÄVIEN VASTAUSTEN TUNNISTUS
    const positiveWords = ["kiitos", "kiitokset", "kiitti", "loistavaa", "hienoa"];
    
    // Tunnistetaan erilaiset luvat ja myöntävät vastaukset
    const searchTriggers = [
        "joo", "kyllä", "tee se", "sopii", "anna mennä", "etsi", 
        "haku", "toteuta", "ok", "okei", "selvä", "passaa"
    ];
    
    const isPositive = positiveWords.some(word => msgLower.startsWith(word));
    const isAskingForSearch = searchTriggers.some(word => msgLower.includes(word)) || msgLower === "joo" || msgLower === "kyllä";

    // Kohteliaisuus-suodatin (vain jos ei pyydetä samalla hakua)
    if (isPositive && msgLower.length < 30 && !isAskingForSearch) {
      return res.json({
        text: "Kiitos palautteesta! Mukava olla avuksi. Mistä jatketaan?",
        sessionId: sessionId 
      });
    }

    // 2. CONTEXT LOCK - LOGIIKKA
    let finalQuery = message;
    // Jos vastaus on hyvin lyhyt myöntävä vastaus, käytetään aiempaa aihetta
    if (isAskingForSearch && msgLower.length < 15 && lastContextTopic) {
      finalQuery = `Kerro lisää aiheesta: ${lastContextTopic}`;
    } else if (msgLower.length > 20) {
      // Tallennetaan uusi aihe muistiin
      lastContextTopic = message;
    }

    // 3. HAKUKYNNYS JA PAKOTETTU HAKU
    const isLawQuery = msgLower.includes("laki") || msgLower.includes("valmistelu") || msgLower.includes("tietoturva");
    
    // Jos käyttäjä antoi luvan (isAskingForSearch), threshold on 0 (pakota haku)
    const currentThreshold = isAskingForSearch ? 0 : (isLawQuery ? 0.001 : 0.05);

    // 4. PREAMBLE
    const preamble = `Olet asiantunteva suomalainen konsultti. Jos portaalin oma data ei riitä, käytä Google Searchia rohkeasti. Jos teet haun verkosta, sano se suoraan. Älä koskaan sano "Yhteenvetoa ei voitu luoda".`;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: finalQuery },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        promptSpec: { preamble },
        includeCitations: true,
        answerLanguageCode: "fi",
        // Estetään "adversarial" -blokit, jotta haku toimii vapaammin
        ignoreAdversarialQuery: true,
        ignoreNonAnswerSeekingQuery: true,
      },
      contentSearchSpec: {
        summaryResultCount: 5,
        googleSearchSpec: {
          dynamicRetrievalConfig: { 
            predictor: { threshold: currentThreshold } 
          } 
        }
      }
    });

    let finalAnswer = response.answer?.answerText;

    // 5. VARMUUS-CHECK (Jos haku silti palauttaa tyhjää)
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda")) {
      finalAnswer = `Portaalin lähteistä ei löytynyt suoraa vastausta aiheeseen: **${lastContextTopic || "tämä"}**. Haluatko, että teen laajemman asiantuntijahaun verkosta?`;
    }

    res.json({ 
      text: finalAnswer,
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
  app.use(express.static(distPath));
}

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send("Palvelin on käynnissä.");
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
