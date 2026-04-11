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
const MODEL_LOCATION = "europe-west1"; // Pidetään Euroopassa
const MODEL_NAME = "gemini-1.5-flash"; // Vakaa nimi ilman tarkkaa versionumeroa (estää 404-virheen)

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
        }
      });
      rawDataContent = searchResponse.answer?.answerText || "";
    } catch (searchErr) {
      console.error("Discovery Engine hakuviive tai virhe:", searchErr);
      // Fallback: jatketaan ilman PDF-kontekstia, jotta yhteys ei katkea
    }

    // --- VAIHE 2: VASTAUKSEN MUODOSTAMINEN ---
    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: { temperature: (isLTS || isSTR) ? 0.1 : 0.4 } 
    });

    let prompt = "";

    if (isLTS || isSTR) {
      // TIUKKA OHJEMOODI TUNNUSSANOILLE
      const fileName = isSTR ? "STRATEGIA ohje.pdf" : "LTS LIIKETOIMINTASUUNNITELMA ohje.pdf";
      
      prompt = `
        Käyttäjä tarvitsee lyhyen täyttöohjeen portaalin kohtaan: "${message}".
        
        Käytä ensisijaisesti tiedoston "${fileName}" sisältöä:
        ${rawDataContent}
        
        SÄÄNNÖT:
        1. Vastaa lyhyesti ja teknisesti: Mitä kohtaan kirjoitetaan ja montako asiaa (esim. max 6).
        2. Anna yksi selkeä esimerkki ohjeen mukaan.
        3. ÄLÄ käytä megatrendejä tai muita yleisiä dokumentteja.
        4. Jos ohjetta ei löydy, vastaa jämptisti portaalin logiikan mukaan.
      `;
    } else {
      // AKATEEMINEN LIIKETOIMINTA-ASIANTUNTIJA
      prompt = `
        Olet akateeminen liiketoiminta-asiantuntija. Vastaa analyyttisesti ja tiiviisti.
        Käytä tätä taustatietoa PDF-dokumenteista: ${rawDataContent}
        Kysymys: "${message}"
        Perustele lyhyesti ja huomioi vuoden 2026 sote- ja liiketoimintaympäristö.
      `;
    }

    const result = await generativeModel.generateContent(prompt);
    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Pahoittelut, vastausta ei voitu luoda.";

    res.json({ 
      text: responseText, 
      sessionId: sessionId 
    });

  } catch (err: any) {
    console.error("KRIITTINEN VIRHE PALVELIMELLA:", err);
    res.status(500).json({ error: "Yhteysvirhe. Yritä uudelleen hetken kuluttua." });
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
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveri käynnissä portissa ${PORT} (europe-west1)`);
});
