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
const MODEL_LOCATION = "us-central1"; 
const MODEL_NAME = "gemini-2.5-flash"; 

const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

const googleSearchTool: any = {
  google_search: {} 
};

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    // --- VAIHE 1: HAKU DATASTORESTA (Discovery Engine) ---
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
      console.error("Discovery Engine error:", searchErr);
    }

    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME,
      tools: [googleSearchTool], 
      generationConfig: { 
        temperature: 0.4, 
        topP: 0.95, 
        maxOutputTokens: 2000 
      }
    });

    /**
     * SYSTEM INSTRUCTION: Optimoitu LTS/STR-kontekstiin.
     * Puhdistettu kömpelöistä johdannoista ja automaattisista esimerkeistä.
     */
    const systemInstruction = `
      Olet erikoistunut LTS (Liiketoimintasuunnitelma) ja STR (Strategia) -asiantuntija. 
      
      RAJAUS: 
      - Vastaa VAIN kysymyksiin, jotka liittyvät liiketoiminnan suunnitteluun, strategiaan tai yrityksen kehittämiseen. [cite: 3, 164]
      - Jos kysymys ei liity LTS- tai STR-teemoihin, ohjaa käyttäjä ystävällisesti takaisin aiheen pariin.

      SISÄINEN LOGIIKKA (Käytä vastauksissa rakenteena, älä luennoi määritelmiä):
      1. Strateginen "Miten" = Kyvykkyys. [cite: 129, 267]
      2. Kyvykkyys = Suunnitelmallinen reagointiresepti diagnoosissa havaittuihin +/- ilmiöihin. [cite: 48, 126, 180, 264]
      3. Osatekijät: Yhdistelmä prosesseja, työkaluja, järjestelmiä, tietotaitoa ja organisaatiota. [cite: 131, 269]
      4. Rajaus: Strategiassa määritellään maksimissaan 6 keskeistä kyvykkyyttä. [cite: 132, 270]

      VASTAUSTYYLI:
      - Mene suoraan asiaan ilman johdantoja ("Kyse on siis...", "Tämä tarkoittaa...").
      - ÄLÄ käytä PDF-ohjeiden myyntisuppilo- tai valmennuskeskusesimerkkiä, ellei käyttäjä kysy juuri siitä. [cite: 130, 268]
      - Varmista, että vastaus on looginen kokonaisuus ja päättyy pisteeseen.
      - Jos käyttäjä kysyy suoraan määritelmää (esim. "Mikä on Miten-kohta?"), vastaa ytimekkäästi näin:
        * Reagointiresepti: Suunnitelmallinen vastaus diagnoosin ilmiöihin. [cite: 48, 126]
        * Osatekijät: Prosessien, työkalujen, järjestelmien, tietotaidon ja organisaation yhdistelmä. [cite: 131, 269]
        * Määrä: Maksimissaan 6 keskeistä kyvykkyyttä. [cite: 132, 270]

      LÄHDE-DATA (PDF):
      "${rawDataContent}"
    `;

    // --- VAIHE 2: GENERATIIVINEN VASTAUS ---
    const result = await generativeModel.generateContent({
      contents: [
        ...history,
        { 
          role: "user", 
          parts: [{ text: `${systemInstruction}\n\nKäyttäjän viesti: ${message}` }] 
        }
      ]
    });

    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Vastausta ei voitu luoda.";

    res.json({ 
      text: responseText, 
      sessionId: sessionId,
      sources: result.response.candidates?.[0].groundingMetadata 
    });

  } catch (err: any) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Yhteysvirhe. Yritä uudelleen." });
  }
});

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
  console.log(`🚀 Palvelin valmiina portissa ${PORT}`);
});
