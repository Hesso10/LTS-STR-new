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
// TÄRKEÄ KORJAUS: Euroopassa vakaa malli on 1.5-flash
const MODEL_LOCATION = "europe-west1"; 
const MODEL_NAME = "gemini-1.5-flash-002"; 

const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    console.log("--- PYYNTÖ ---", message);

    // 1. TUNNISTUS
    const isWEB = msgLower.startsWith("web");
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    // --- LOGIIKKA 1: SUORA GOOGLE-HAKU (Jos käyttäjä pyytää 'web') ---
    if (isWEB) {
      const querySubject = message.replace(/^web\s+/i, "").trim();
      const generativeModel = vertexAI.getGenerativeModel({
        model: MODEL_NAME,
        tools: [{ googleSearchRetrieval: {} } as any], 
      });

      const result = await generativeModel.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: `Toimi sote-alan asiantuntijana. Tee haku: ${querySubject} perspektiivillä 2026. Vastaa suomeksi.` }] 
        }],
      });

      return res.json({ text: result.response.candidates?.[0].content.parts?.[0].text, sessionId });
    }

    // --- LOGIIKKA 2: PDF-HAKU (Käytetään alkuperäistä polkua) ---
    let finalQuery = message;
    if (isLTS || isSTR) {
        // Tässä voit käyttää alkuperäisiä LTS_STRUCTURE / STR_STRUCTURE -määrityksiäsi
        finalQuery = message; 
    }

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    // Käytetään answerQuerya, mutta varmistetaan että se palauttaa edes jotain
    const [response] = await searchClient.answerQuery({
      servingConfig,
      query: { text: finalQuery },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        answerLanguageCode: "fi",
        includeCitations: true,
      }
    });

    const answerText = response.answer?.answerText;

    // JOS PDF-HAKU ONNISTUU:
    if (answerText) {
      return res.json({ 
        text: answerText, 
        sessionId: response.session?.name 
      });
    }

    // FALLBACK: Jos PDF ei löydä mitään, käytetään Geminiä
    const fallbackModel = vertexAI.getGenerativeModel({ model: MODEL_NAME });
    const fallbackResult = await fallbackModel.generateContent(message);
    res.json({ text: fallbackResult.response.candidates?.[0].content.parts?.[0].text, sessionId });

  } catch (err: any) {
    console.error("VIRHE:", err);
    res.status(500).json({ error: "Yhteysvirhe. Yritä uudelleen." });
  }
});

// Portti ja käynnistys
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveri käynnissä portissa ${PORT}`);
});
