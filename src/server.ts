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
const MODEL_NAME = "gemini-1.5-flash";

// --- CLIENTIEN ALUSTUS ---
const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

// Enterprise Grounding -työkalu (varmistettu snake_case)
const googleSearchTool: any = {
  google_search_retrieval: {} 
};

// --- API-REITTI ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    console.log(`--- PYYNTÖ: ${message.substring(0, 50)}... ---`);

    // --- VAIHE 1: HAKU DATASTORESTA (PDF-sisältö) ---
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
      console.error("Discovery Engine haku ei onnistunut, jatketaan Groundingilla:", searchErr);
    }

    // --- VAIHE 2: GENERATIIVINEN MALLI (Enterprise Grounding) ---
    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME,
      tools: [googleSearchTool], 
      generationConfig: { 
        temperature: 0.7, 
        topP: 0.95,
        maxOutputTokens: 2048
      }
    });

    // Ohjeistus: Akateeminen sparraaja, joka yhdistää lähteet saumattomasti
    const systemInstruction = `
      Olet akateeminen liiketoiminnan suunnittelija ja strateginen sparraaja. 
      Tyylisi on asiallinen, asiantunteva, ytimekäs ja motivoiva.
      
      KÄYTÄSSÄSI ON KAKSI TIETOLÄHDETTÄ:
      1. PDF-DATASTORE: "${rawDataContent}" - Käytä tätä raameina ja teknisinä ohjeina.
      2. GOOGLE SEARCH (Grounding): Käytä tätä tuomaan tuoreita esimerkkejä ja markkinatietoa.
      
      TEHTÄVÄSI:
      - Luo "Blended Summary": Yhdistä PDF-sisällön raamit ja Googlen reaaliaikainen tieto.
      - Jos viesti alkaa STR tai LTS, varmista että vastaus auttaa täyttämään kyseisen kohdan tarkasti, mutta anna Google-haun avulla laadukkaita esimerkkejä.
      - Ole analyyttinen mutta kannustava. Perustele näkemyksesi asiantuntijatiedolla.
    `;

    const result = await generativeModel.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `${systemInstruction}\n\nKäyttäjän kysymys: ${message}` }] 
      }]
    });

    const response = result.response;
    const responseText = response.candidates?.[0].content.parts?.[0].text || "Pahoittelut, vastausta ei voitu luoda.";
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

// --- FRONTENDIN TARJOILU ---
// Huomioidaan, että tiedosto on src/ kansiossa -> dist on projektin juuressa
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
      // Hyödyllinen loki debuggaukseen, jos dist-kansio puuttuu
      res.status(404).send(`Frontend build not found at ${distPath}`);
    }
  }
});

// --- KÄYNNISTYS ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Akateeminen Enterprise-palvelin käynnissä portissa ${PORT}`);
  console.log(`🌍 Alue: ${MODEL_LOCATION}, Grounding: Aktivoitu`);
});
