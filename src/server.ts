import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { VertexAI } from "@google-cloud/vertexai"; 
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import admin from "firebase-admin"; 

dotenv.config();

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

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

const googleSearchTool: any = { google_search: {} };

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId, history = [], uid } = req.body;
    
    if (!message || !uid) return res.status(400).json({ error: "Tietoja puuttuu" });

    // --- 1. 100 KYSYMYKSEN RAJOITIN ---
    const now = new Date();
    const monthId = `${now.getFullYear()}-${now.getUTCMonth() + 1}`;
    const usageRef = db.collection("users").doc(uid).collection("usage").doc("currentMonth");

    try {
      const usageDoc = await usageRef.get();
      if (usageDoc.exists && usageDoc.data()?.count >= 100) {
        return res.status(429).json({ error: "Kuukausittainen kyselyraja (100) on täyttynyt." });
      }
    } catch (e) { console.error("Counter check error", e); }

    // --- 2. HAKU PDF-DATASTA ---
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;
    let context = "";
    try {
      const [searchResponse] = await searchClient.answerQuery({
        servingConfig,
        query: { text: message },
        answerGenerationSpec: { answerLanguageCode: "fi" }
      });
      context = searchResponse.answer?.answerText || "";
    } catch (e) { console.error("Search error", e); }

    // --- 3. KAKSIVAIHEINEN SYSTEM INSTRUCTION ---
    const instructionText = `
      Toimi analyyttisena ja motivoivana liiketoiminnan sparraajana. 
      Käytä ammattimaista mutta helposti lähestyttävää kieltä.
      LÄHDE-DATA PDF-TIEDOISTA: "${context}"

      ERIKOISLOGIIKKA:
      - Jos käyttäjän viesti sisältää tunnussanan "LTS" tai "STR" ja portaalin valikon otsikon:
        1. Toimi tiukasti käyttöohjeena.
        2. Etsi LÄHDE-DATASTA juuri se kohta, joka vastaa otsikkoa.
        3. Vastaa ytimekkäästi ja suoraan PDF-ohjeen mukaisesti.
      
      - MUISSA TAPAUKSISSA (Jos tunnussanoja ei ole):
        1. Toimi motivoivana sparraajana.
        2. Hyödynnä PDF-dataa soveltuvin osin (erityisesti STR- ja LTS-malleja).
        3. Vastaa suoraan ja kannustavasti käyttäjän kysymykseen.
    `;

    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      tools: [googleSearchTool],
      generationConfig: { temperature: 0.4 } 
    });

    const result = await generativeModel.generateContent({
      contents: [
        ...history,
        { role: "user", parts: [{ text: `${instructionText}\n\nKÄYTTÄJÄN VIESTI: ${message}` }] }
      ]
    });

    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Vastausta ei voitu luoda.";

    // --- 4. LASKURIN PÄIVITYS ---
    try {
      await usageRef.set({
        count: admin.firestore.FieldValue.increment(1),
        monthId: monthId,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
        userId: uid
      }, { merge: true });
    } catch (e) { console.error("Counter update error", e); }

    res.json({ text: responseText, sessionId });

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Palvelinvirhe" });
  }
});

const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) { app.use(express.static(distPath)); }
app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  }
});

app.listen(process.env.PORT || 8080);
