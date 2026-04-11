// src/server.ts
import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { VertexAI, GoogleSearchRetrieval } from "@google-cloud/vertexai"; // UUSI KIRJASTO
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

// 1. Alustetaan molemmat asiakkaat
const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: "us-central1" }); // Gemini-haut usein vakaimpia us-central1:ssä

// Globaali muuttuja context-lockia varten
let lastContextTopic = "";

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    console.log("\n--- UUSI PYYNTÖ ---");
    console.log("Käyttäjän syöte:", message);

    // 2. Tunnistus
    const isWEB = msgLower.startsWith("web");
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    // --- LOGIIKKA 1: ITSENÄINEN WEB-HAKU (Vertex AI Gemini) ---
    if (isWEB) {
      console.log("Logiikka: ITSENÄINEN GEMINI + GOOGLE SEARCH");
      const querySubject = message.replace(/^web\s+/i, "").trim();
      
      const generativeModel = vertexAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        tools: [{ googleSearchRetrieval: {} } as any], // Aktivoi itsenäisen Google-haun
      });

      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: `Toimi sote-alan strategisena asiantuntijana. Tee syvällinen verkkohaku ja analyysi aiheesta: ${querySubject}. Vastaa suomeksi.` }] }],
      });

      const finalAnswer = result.response.candidates?.[0].content.parts?.[0].text || "Hakua ei voitu suorittaa.";
      
      return res.json({ text: finalAnswer, sessionId });
    }

    // --- LOGIIKKA 2: ANKKUROITU PDF-HAKU (Discovery Engine) ---
    let finalQuery = message;
    let currentThreshold = 0.05;

    if (isLTS) {
      const userTerm = message.replace(/^lts\s+/i, "").toLowerCase().trim();
      const LTS_STRUCTURE: { [key: string]: string } = {
        "yritysmuoto": "Yritysmuoto (sivu 1): Valinta ja suositukset.",
        "tausta": "Tausta (sivu 2): Osaaminen ja vahvuudet.",
        "liikeidea": "Liikeidea (sivu 2): Mitä, miten ja kenelle?",
        "toimintaympäristö": "Ulkoisen toimintaympäristön analyysi (sivut 3-4).",
        "miten": "Miten-osio (sivu 6): Kyvykkyydet ja reagointi diagnoosiin.",
        "strategia": "Strategia (sivu 6): Visio, arvot ja diagnoosi."
      };
      finalQuery = `Etsi tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' tarkka ohje: ${LTS_STRUCTURE[userTerm] || userTerm}`;
      currentThreshold = 0.4;
    } 
    else if (isSTR) {
      const userTerm = message.replace(/^str\s+/i, "").toLowerCase().trim();
      const STR_STRUCTURE: { [key: string]: string } = {
        "yritykseni": "Yritykseni (sivu 1): Historia ja nykytila.",
        "miten": "Miten-osio (sivu 5): Kyvykkyydet ja reagointi diagnoosiin.",
        "liiketoimintamalli": "Liiketoimintamalli (sivu 5): Taktiikka ja resurssit.",
        "resurssit": "Tärkeimmät resurssit (sivu 6): Aineelliset ja aineettomat."
      };
      finalQuery = `Etsi tiedostosta 'STRATEGIA ohje.pdf' tarkka ohje: ${STR_STRUCTURE[userTerm] || userTerm}`;
      currentThreshold = 0.4;
    }

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await searchClient.answerQuery({
      servingConfig,
      query: { text: finalQuery },
      answerGenerationSpec: {
        promptSpec: { preamble: "Olet sote-alan strategiakonsultti. Vastaa PDF-ohjeiden perusteella." },
        answerLanguageCode: "fi",
      },
      contentSearchSpec: {
        googleSearchSpec: { dynamicRetrievalConfig: { predictor: { threshold: currentThreshold } } }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Vastausta ei saatu.",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("VIRHE:", err);
    res.status(500).json({ error: "Yhteysvirhe tekoälyyn." });
  }
});

const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) app.use(express.static(distPath));

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
