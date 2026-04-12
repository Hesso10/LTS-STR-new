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

const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 
const MODEL_LOCATION = "us-central1"; 
const MODEL_NAME = "gemini-2.5-flash"; 

const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

const googleSearchTool: any = {
  google_search: {} 
};

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

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
      console.error("Discovery Engine haku epäonnistui:", searchErr);
    }

    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME,
      tools: [googleSearchTool], 
      generationConfig: { temperature: 0.4, topP: 0.95, maxOutputTokens: 2048 }
    });

    const systemInstruction = `
      Olet akateeminen liiketoiminnan asiantuntija. 
      
      KESKEISET KÄSITTEET:
      - "Miten" = Kyvykkyys (Capability). Prosessien, työkalujen ja osaamisen liitto.
      - "Liiketoimintamalli" = Taktiikkatason toteutus strategialle ja kyvykkyyksille.
      
      TOIMINTAMALLIT:
      1. TUNNUSSANA-TILA (LTS/STR + otsikko):
         - Palauta PDF-ohje (rawDataContent) 1:1 kyseiselle kohdalle.
         - Lisää loppuun "Nykypäivän esimerkkejä (2026)" Google Searchin avulla.
      2. VAPAA SPARRAUSTILA:
         - Hyödynnä kaikkia PDF-materiaaleja ja Google Groundingia.
      
      SUOSITELTAVAT LÄHTEET:
      - Viranomaistieto: prh.fi, suomi.fi, stat.fi, finlex.fi, suomenpankki.fi.
      - Strategia: hbr.org, mckinsey.com, deloitte.com.
      - Liiketoimintamalli: strategyzer.com (Value Proposition & Business Model Canvas).
      
      LÄHDE-DATA (PDF):
      "${rawDataContent}"
    `;

    const result = await generativeModel.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `${systemInstruction}\n\nKäyttäjän viesti: ${message}` }] 
      }]
    });

    const response = result.response;
    res.json({ 
      text: response.candidates?.[0].content.parts?.[0].text || "Vastausta ei voitu luoda.", 
      sessionId: sessionId,
      sources: response.candidates?.[0].groundingMetadata 
    });

  } catch (err: any) {
    res.status(500).json({ error: "Yhteysvirhe. Yritä uudelleen." });
  }
});

const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) { app.use(express.static(distPath)); }
app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) { res.sendFile(indexPath); }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Palvelin käynnissä portissa ${PORT}`);
});
