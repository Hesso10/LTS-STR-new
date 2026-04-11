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
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 
const MODEL_LOCATION = "europe-west1"; 
const MODEL_NAME = "gemini-1.5-flash-002"; 

// 1. Alustetaan asiakkaat
// Käytetään ConversationalSearchServiceClientia v1-versiona (vakain)
const searchClient = new ConversationalSearchServiceClient({
    apiEndpoint: "global-discoveryengine.googleapis.com"
});
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

// API-reitti viesteille
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    console.log("--- UUSI PYYNTÖ ---", message);

    // --- VAIHE 1: PDF-HAKU ---
    let finalQuery = message;
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    if (isLTS) {
      const userTerm = message.replace(/^lts\s+/i, "").toLowerCase().trim();
      finalQuery = `Etsi ohje tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' aiheesta: ${userTerm}`;
    } else if (isSTR) {
      const userTerm = message.replace(/^str\s+/i, "").toLowerCase().trim();
      finalQuery = `Etsi ohje tiedostosta 'STRATEGIA ohje.pdf' aiheesta: ${userTerm}`;
    }

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;
    
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

    // --- VAIHE 2: GEMINI + GOOGLE SEARCH ---
    const generativeModel = vertexAI.getGenerativeModel({
      model: MODEL_NAME,
      tools: [{ googleSearchRetrieval: {} } as any], 
    });

    const prompt = {
      contents: [{ 
        role: "user", 
        parts: [{ text: `
          Olet sote-alan strategiakonsultti. 
          KÄYTTÄJÄN KYSYMYS: "${message}"
          TIETO PDF-OHJEISTA: ${pdfContent}
          
          TEHTÄVÄ:
          1. Käytä Google-hakua vuoden 2026 perspektiivillä.
          2. Muodosta vastaus noudattaen PDF-ohjeiden rakennetta.
          3. Ehdota työkaluja ja vastaa suomeksi.
        `}] 
      }],
    };

    const result = await generativeModel.generateContent(prompt);
    const finalAnswer = result.response.candidates?.[0].content.parts?.[0].text || "Vastausta ei saatu.";

    res.json({ text: finalAnswer, sessionId: searchResponse.session?.name });

  } catch (err: any) {
    console.error("VIRHE PALVELIMELLA:", err);
    res.status(500).json({ error: "Yhteysvirhe tekoälyyn." });
  }
});

// Staattiset tiedostot ja SPA-tuki
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
      res.status(404).send("Frontend not found. Build the project first.");
    }
  }
});

// KÄYNNISTYS
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Palvelin käynnissä portissa ${PORT}`);
  console.log(`📍 Malli: ${MODEL_NAME}, Sijainti: ${MODEL_LOCATION}`);
});
