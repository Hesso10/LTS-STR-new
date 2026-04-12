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

// Enterprise Grounding -työkalu
const googleSearchTool = {
  googleSearchRetrieval: {} 
};

// --- API-REITTI ---
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    console.log("--- PYYNTÖ VASTAANOTETTU ---", message);

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
          includeCitations: true 
        }
      });
      rawDataContent = searchResponse.answer?.answerText || "";
    } catch (searchErr) {
      console.error("Discovery Engine hakuviive tai virhe:", searchErr);
      // Jatketaan silti, Google Grounding voi pelastaa vastauksen
    }

    // --- VAIHE 2: VASTAUKSEN MUODOSTAMINEN (Enterprise Blended Mode) ---
    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME,
      tools: [googleSearchTool], // Google Grounding aina päällä
      generationConfig: { 
        temperature: 0.7, // Korkea lämpötila = enemmän vapautta ja luovuutta
        topP: 0.95,
        maxOutputTokens: 2048
      }
    });

    // Akateemisen asiantuntijan ohjeistus (System Instruction)
    const systemInstruction = `
