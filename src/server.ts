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

/**
 * 2026 Enterprise-standardit:
 * MODEL_LOCATION: us-central1 takaa Google Search Grounding -tuen.
 * MODEL_NAME: gemini-2.5-flash on uusin vakaa ja nopea malli.
 */
const MODEL_LOCATION = "us-central1"; 
const MODEL_NAME = "gemini-2.5-flash"; 

// --- CLIENTIEN ALUSTUS ---
const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

/** * Enterprise Grounding -työkalu (Gemini 2.5+ syntaksi)
 */
const googleSearchTool: any = {
  google_search: {} 
};

// --- API-REITTI ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    
    // Portaalien tunnistus etuliitteistä
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    console.log(`--- PYYNTÖ VASTAANOTETTU: ${isLTS ? 'LTS' : isSTR ? 'STR' : 'YLEINEN'} ---`);

    // --- VAIHE 1: HAKU DATASTORESTA (PDF-ohjeet) ---
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;
    
    let rawDataContent = "";
    try {
      const [searchResponse] = await searchClient.answerQuery({
        servingConfig,
        query: { text: message },
        session: sessionId ? { name: sessionId } : undefined,
        answerGenerationSpec: { 
          answerLanguageCode: "fi",
          includeCitations: true 
        }
      });
      rawDataContent = searchResponse.answer?.answerText || "";
    } catch (searchErr) {
      console.error("Discovery Engine haku epäonnistui, jatketaan Groundingilla:", searchErr);
    }

    // --- VAIHE 2: GENERATIIVINEN MALLI ---
    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME,
      tools: [googleSearchTool], 
      generationConfig: { 
        temperature: 0.4, // Matala lämpötila takaa asiallisen ja tarkan vastaustyylin
        topP: 0.95,
        maxOutputTokens: 2048
      }
    });

    // OHJEISTUS: Akateeminen sparraaja, joka erottaa LTS ja STR portaalit
    const systemInstruction = `
      Olet akateeminen liiketoiminnan asiantuntija ja strateginen sparraaja. 
      Tyylisi on asiallinen, motivoiva ja analyyttinen.
      
      PORTAALIKOHTAISET SÄÄNNÖT:
      1. Jos viesti alkaa "LTS": Noudata Liiketoimintasuunnitelma-ohjeita (liikeidea, yritysmuoto, operatiivinen toiminta).
      2. Jos viesti alkaa "STR": Noudata Strategia-ohjeita (visio, diagnoosi, kyvykkyydet/miten-kohdat, liiketoimintamalli).
      3. Jos etuliitettä ei ole: Päättele kysymyksestä kumpi portaali on kyseessä tai vastaa yleisenä asiantuntijana molempia PDF-ohjeita hyödyntäen.
      
      VASTAUKSEN RAKENNE:
      - Aloita aina tiivistämällä PDF-ohjeen ydin kyseiselle portaalin kohdalle.
      - Käytä Google Searchia (Grounding) tuomaan VÄHINTÄÄN 3 tuoretta ja konkreettista esimerkkiä vuodelta 2026.
      - Vastaa selkeällä suomen kielellä.
      
      LÄHDE-DATA (PDF):
      "${rawDataContent}"
    `;

    const result = await generativeModel.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `${systemInstruction}\n\nKäyttäjän syöte: ${message}` }] 
      }]
    });

    const response = result.response;
    const responseText = response.candidates?.[0].content.parts?.[0].text || "Vastausta ei voitu luoda.";
    const groundingMetadata = response.candidates?.[0].groundingMetadata;

    res.json({ 
      text: responseText, 
      sessionId: sessionId,
      sources: groundingMetadata 
    });

  } catch (err: any) {
    console.error("KRIITTINEN VIRHE API-REITILLÄ:", err);
    res.status(500).json({ error: "Yhteysvirhe. Yritä uudelleen hetken kuluttua." });
  }
});

// --- FRONTENDIN TARJOILU (dist-kansio) ---
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
      res.status(404).send("Frontend build not found");
    }
  }
});

// --- KÄYNNISTYS ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Portaali-palvelin pystyssä portissa ${PORT}`);
  console.log(`🌍 Alue: ${MODEL_LOCATION}, Malli: ${MODEL_NAME}`);
});
