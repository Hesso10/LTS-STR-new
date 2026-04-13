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
        maxOutputTokens: 2000 // Nostettu 2000:een, jotta lauseet eivät katkea kesken
      }
    });

    /**
     * SYSTEM INSTRUCTION: Optimoitu laatu, pituus ja looginen lopetus.
     */
    const systemInstruction = `
      Toimi analyyttisena ja motivoivana liiketoiminnan sparraajana. 

      TÄRKEÄÄ: Vastaa suoraan ja ytimekkäästi. Älä käytä pitkiä johdantoja tai turhia kohteliaisuuksia. 
      Varmista, että jokainen vastaus on looginen kokonaisuus ja päättyy AINA pisteeseen. 
      Jos vastaus uhkaa venyä, tiivistä asiasisältöä mieluummin kuin jätät lausetta kesken.

      TOIMINTATAVAT:

      1. TUNNUSSANA-TILA (LTS tai STR + otsikko):
          - Etsi PDF-datasta VAIN kyseistä otsikkoa vastaava ohje.
          - Tiivistä ohje erittäin ytimekkääksi (n. 100-150 sanaa).
          - ÄLÄ lisää mitään ylimääräisiä otsikoita tai esimerkkejä loppuun.
          - Vastaa puhtaasti PDF-sisällön pohjalta.

      2. VAPAA SPARRAUSTILA (Ei tunnussanaa):
          - Tarjoa syvällistä analyysia tiiviissä muodossa.
          - Käytä rakenteena listoja ja selkeitä väliotsikoita.
          - Tuo mukaan nykypäivän esimerkkejä ja globaaleja oppeja (2026) lähteistä: hbr.org, mckinsey.com, deloitte.com, strategyzer.com.
          - Suosi virallisia lähteitä (stat.fi, prh.fi, suomi.fi).

      HUOMIO: "Miten" = Kyvykkyys. Se on suunnitelmallinen reagointiresepti (prosessit, työkalut, osaaminen).
      
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
