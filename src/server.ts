import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { VertexAI } from "@google-cloud/vertexai"; 
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- KONFIGURAATIO ---
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; // Discovery Engine (PDF-haku)
const ENGINE_ID = "lts-str_1775635155437"; 

// Käytetään vakaata Euroopan aluetta ja mallia, joka vastaa paneelin "Stable"-asetusta
const MODEL_LOCATION = "europe-west1"; 
const MODEL_NAME = "gemini-1.5-flash-002"; 

// 1. Alustetaan asiakkaat
// Lisätty apiEndpoint varmistamaan yhteys oikeaan konesaliin
const searchClient = new ConversationalSearchServiceClient({
    apiEndpoint: "global-discoveryengine.googleapis.com"
});
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    console.log("\n--- UUSI PYYNTÖ ---");
    console.log("Käyttäjän syöte:", message);

    // --- VAIHE 1: ANKKUROINTI JA PDF-HAKU (Discovery Engine) ---
    let finalQuery = message;
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    if (isLTS) {
      const userTerm = message.replace(/^lts\s+/i, "").toLowerCase().trim();
      const LTS_STRUCTURE: { [key: string]: string } = {
        "yritysmuoto": "Yritysmuoto (sivu 1): Valinta ja suositukset.",
        "tausta": "Tausta (sivu 2): Osaaminen, kokemus ja vahvuudet.",
        "liikeidea": "Liikeidea (sivu 2): Mitä, miten ja kenelle?.",
        "strategia": "Strategia: Visio, arvot ja diagnoosi.",
        "miten": "Miten-osio: Kyvykkyydet (max 6) ja reagointi diagnoosiin.",
        "markkinointi": "Myynti & markkinointi: Kohderyhmät ja kanavat."
      };
      finalQuery = `Etsi tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' tarkka ohje: ${LTS_STRUCTURE[userTerm] || userTerm}`;
    } 
    else if (isSTR) {
      const userTerm = message.replace(/^str\s+/i, "").toLowerCase().trim();
      const STR_STRUCTURE: { [key: string]: string } = {
        "yritykseni": "Yritykseni: Historia, nykytila ja päätuotteet.",
        "toimintaympäristö": "Toimintaympäristö: Ulkoinen analyysi ja diagnoosi.",
        "strategia": "Strategia: Visio, arvot ja reagointiresepti.",
        "miten": "Miten-osio: Kyvykkyydet ja reagointi diagnoosiin.",
        "liiketoimintamalli": "Liiketoimintamalli: Taktiikka ja resurssit."
      };
      finalQuery = `Etsi tiedostosta 'STRATEGIA ohje.pdf' tarkka ohje: ${STR_STRUCTURE[userTerm] || userTerm}`;
    }

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;
    
    // Suoritetaan PDF-haku
    const [searchResponse] = await searchClient.answerQuery({
      servingConfig,
      query: { text: finalQuery },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        answerLanguageCode: "fi",
        includeCitations: true
      }
    });

    const pdfContent = searchResponse.answer?.answerText || "Ei löytynyt tarkkaa PDF-ohjetta.";

    // --- VAIHE 2: GEMINI + GOOGLE SEARCH (Grounding) ---
    // Tässä vaiheessa yhdistetään PDF-haku ja reaaliaikainen verkkohaku
    
    const generativeModel = vertexAI.getGenerativeModel({
      model: MODEL_NAME,
      tools: [{ googleSearchRetrieval: {} } as any], 
    });

    const prompt = {
      contents: [{ 
        role: "user", 
        parts: [{ text: `
          Olet sote-alan strategiakonsultti. Tehtäväsi on auttaa käyttäjää liiketoimintasuunnitelman tai strategian täyttämisessä.
          
          KÄYTTÄJÄN KYSYMYS: "${message}"
          
          TIETO PDF-OHJEISTA:
          ${pdfContent}
          
          TEHTÄVÄ:
          1. Käytä Google-hakua löytääksesi tuoreinta tietoa sote-alasta, trendeistä ja teknologioista (perspektiivi vuosi 2026).
          2. Muodosta vastaus, joka noudattaa PDF-ohjeiden rakennetta, mutta täydentää sitä verkkohaun tuomalla markkinatiedolla.
          3. Ehdota konkreettisia työkaluja tai prosesseja strategian tueksi.
          4. Vastaa suomeksi ja asiantuntevasti.
        `}] 
      }],
    };

    const result = await generativeModel.generateContent(prompt);
    const finalAnswer = result.response.candidates?.[0].content.parts?.[0].text || "Vastausta ei voitu muodostaa.";

    console.log("Vastaus muodostettu onnistuneesti.");

    res.json({ 
      text: finalAnswer, 
      sessionId: searchResponse.session?.name 
    });
