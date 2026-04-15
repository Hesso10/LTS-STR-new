import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { VertexAI } from "@google-cloud/vertexai"; 
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
// KORJAUS: Oikea tapa tuoda admin-objekti
import admin from "firebase-admin"; 

dotenv.config();

// --- FIREBASE ADMIN ALUSTUS ---
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// --- KONFIGURAATIO ---
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 
const MODEL_LOCATION = "us-central1"; 
// KORJAUS: Tarkka mallin nimi, joka välttää 404-virheen
const MODEL_NAME = "gemini-1.5-flash-001"; 

const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

const googleSearchTool: any = {
  google_search: {} 
};

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId, history = [], uid } = req.body;
    
    if (!message) return res.status(400).json({ error: "Viesti puuttuu" });
    if (!uid) return res.status(401).json({ error: "Unauthorized: Kirjaudu sisään ensin" });

    // --- VAIHE 0: 100 KYSYMYKSEN RAJOITIN ---
    const now = new Date();
    const monthId = `${now.getFullYear()}-${now.getUTCMonth() + 1}`;
    const usageRef = db.collection("users").doc(uid).collection("usage").doc("currentMonth");

    try {
      const usageDoc = await usageRef.get();
      if (usageDoc.exists) {
        const data = usageDoc.data();
        if (data?.monthId === monthId && data?.count >= 100) {
          return res.status(429).json({ 
            error: "Kuukausittainen kyselyraja (100) on täyttynyt." 
          });
        }
      }
    } catch (dbErr) {
      console.error("Firestore limit check error:", dbErr);
    }

    // --- VAIHE 1: HAKU DATASTORESTA ---
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

    const systemInstruction = `
      Toimi analyyttisena ja motivoivana liiketoiminnan sparraajana. 
      Vastaa suoraan ja ytimekkäästi PDF-datan pohjalta.
      LÄHDE-DATA: "${rawDataContent}"
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

    // --- VAIHE 3: LASKURIN PÄIVITYS ---
    try {
      await usageRef.set({
        count: admin.firestore.FieldValue.increment(1),
        monthId: monthId,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
        userId: uid
      }, { merge: true });
    } catch (updateErr) {
      console.error("Failed to increment usage counter:", updateErr);
    }

    res.json({ 
      text: responseText, 
      sessionId: sessionId,
      sources: result.response.candidates?.[0].groundingMetadata 
    });

  } catch (err: any) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Yhteysvirhe palvelimeen. Yritä uudelleen." });
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
