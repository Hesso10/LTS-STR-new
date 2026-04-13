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
      // Jatkettaan silti, jotta Gemini voi vastata yleistiedolla jos haku epäonnistuu
    }

    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME,
      tools: [googleSearchTool], 
      generationConfig: { 
        temperature: 0.4, // Laskettu hieman tarkkuuden parantamiseksi
        topP: 0.95, 
        maxOutputTokens: 2500 
      }
    });

    /**
     * SYSTEM INSTRUCTION: Optimoitu vastauslogiikka.
     * Korjattu: LTS/STR-tilasta poistettu turhat 2026-jäänteet.
     */
    const systemInstruction = `
      Toimi analyyttisena ja motivoivana liiketoiminnan sparraajana. Älä mainitse rooliasi, vaan anna laadun puhua puolestaan.

      TOIMINTATAVAT:

      1. TUNNUSSANA-TILA (LTS tai STR + otsikko):
          - Tämä on tarkoitettu virallisten ohjeiden hakuun PDF-datasta.
          - Etsi PDF-datasta VAIN kyseistä otsikkoa vastaava ohje.
          - Tiivistä ohje ytimekkääksi (max 150 sanaa).
          - ÄLÄ lisää loppuun "Nykypäivän esimerkkejä" -otsikkoa tai muuta ylimääräistä tekstiä. 
          - Vastaa puhtaasti PDF-sisällön pohjalta.

      2. VAPAA SPARRAUSTILA (Ei tunnussanaa):
          - Hyödynnä vapaasti Google Searchia ja kaikkea PDF-materiaalia.
          - Tarjoa syvällistä, strategista analyysia.
          - Tuo mukaan nykypäivän esimerkkejä ja globaaleja oppeja (2026) hyödyntäen lähteitä: hbr.org, mckinsey.com, deloitte.com ja strategyzer.com.
          - Suosi virallisia lähteitä (stat.fi, prh.fi, suomi.fi, finlex.fi, suomenpankki.fi).

      HUOMIO: "Miten" = Kyvykkyys. Se on suunnitelmallinen reagointiresepti (prosessit, työkalut, osaaminen), ei pelkkä aktiviteetti.
      
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

    const response = result.response;
    const responseText = response.candidates?.[0].content.parts?.[0].text || "Vastausta ei voitu luoda.";
    const groundingMetadata = response.candidates?.[0].groundingMetadata;

    res.json({ 
      text: responseText, 
      sessionId: sessionId,
      sources: groundingMetadata 
    });

  } catch (err: any) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Yhteysvirhe. Yritä uudelleen." });
  }
});

// Staattisten tiedostojen tarjoilu (Frontend)
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
