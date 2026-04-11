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

const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

// --- API-REITTI ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    console.log("--- PYYNTÖ ---", message);

    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");
    const isWEB = msgLower.startsWith("web");

    // --- VAIHE 1: HAKU DATASTORESTA ---
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;
    
    const [searchResponse] = await searchClient.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        answerLanguageCode: "fi",
        includeCitations: true,
      }
    });

    const rawDataContent = searchResponse.answer?.answerText || "";

    // --- VAIHE 2: LOGIIKKA TUNNUSSANAN MUKAAN ---

    // A) TIUKKA OHJEMOODI (LTS/STR)
    if (isLTS || isSTR) {
      const instructionModel = vertexAI.getGenerativeModel({ 
        model: MODEL_NAME,
        generationConfig: { temperature: 0.1 } 
      });
      
      const fileName = isSTR ? "STRATEGIA ohje.pdf" : "LTS LIIKETOIMINTASUUNNITELMA ohje.pdf";
      
      const instructionPrompt = `
        Käyttäjä tarvitsee lyhyen ja selkeän täyttöohjeen portaalin kohtaan.
        
        Käytä TIUKASTI VAIN tätä tietoa tiedostosta "${fileName}":
        ${rawDataContent}
        
        SÄÄNNÖT:
        1. Poista kaikki tieto, joka ei ole suoraan täyttöohje (kuten megatrendit).
        2. Vastaa lyhyesti: Mitä tähän portaalin kohtaan kirjoitetaan, montako kohtaa ja anna yksi selkeä esimerkki.
        3. Jos tietoa ei löydy juuri tästä ohjeesta, sano: "Kyseistä kohtaa ei löytynyt ohjetiedostosta."
      `;
      
      const result = await instructionModel.generateContent(instructionPrompt);
      return res.json({ 
        text: result.response.candidates?.[0].content.parts?.[0].text, 
        sessionId: searchResponse.session?.name 
      });
    }

    // B) AKATEEMINEN LIIKETOIMINTA-ASIANTUNTIJA (WEB TAI YLEINEN)
    const generativeModel = vertexAI.getGenerativeModel({
      model: MODEL_NAME,
      tools: isWEB ? [{ googleSearchRetrieval: {} } as any] : [],
      generationConfig: { temperature: 0.4 }
    });

    const expertPrompt = `
      Olet akateeminen liiketoiminta-asiantuntija ja strateginen analyytikko. 
      Vastaustyylisi on tiivis, analyyttinen ja hyvin perusteltu.
      
      OHJEET VASTAUKSEEN:
      1. Priorisoi akateemisesti uskottavia lähteitä: Tilastokeskus, Finlex, OECD, Gartner, McKinsey, BCG tai viralliset viranomaisraportit.
      2. Jos käytät Google-hakua (web), liitä vastauksen loppuun suorat linkit merkittävimpiin lähteisiin.
      3. Perustele väitteesi lyhyesti syy-seuraussuhteilla.
      4. Hyödynnä tätä taustamateriaalia PDF-ohjeista: ${rawDataContent}
      
      Käyttäjän kysymys: "${message}"
      Vastaa asiantuntevasti suomeksi.
    `;

    const result = await generativeModel.generateContent(expertPrompt);
    res.json({ 
      text: result.response.candidates?.[0].content.parts?.[0].text, 
      sessionId: searchResponse.session?.name 
    });

  } catch (err: any) {
    console.error("VIRHE:", err);
    res.status(500).json({ error: "Yhteysvirhe. Yritä uudelleen." });
  }
});

// --- FRONTENDIN TARJOILU ---
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
      res.status(404).send("Frontend build missing. Please run build first.");
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Akateeminen serveri käynnissä portissa ${PORT}`);
});
