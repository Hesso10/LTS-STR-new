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

// --- ASETUKSET ---
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

    // --- 1. LASKURIN TARKISTUS ---
    const now = new Date();
    const monthId = `${now.getFullYear()}-${now.getUTCMonth() + 1}`;
    const usageRef = db.collection("users").doc(uid).collection("usage").doc("currentMonth");

    try {
      const usageDoc = await usageRef.get();
      if (usageDoc.exists && usageDoc.data()?.count >= 100) {
        return res.status(429).json({ error: "Kuukausiraja täynnä." });
      }
    } catch (e) { console.error(e); }

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

    // --- 3. PÄIVITETTY ÄLYKÄS OHJEISTUS (ILMAN TAULUKOITA) ---
    const instructionText = `
### IDENTITEETTI
Toimit asiantuntevana suomalaisena liiketoimintastrategina. Tyylisi on analyyttinen, akateeminen ja rakentava.

### SÄÄNTÖ 1: EI TAULUKOITA
- ÄLÄ KOSKAAN käytä vastauksissa Markdown-taulukoita (|---|). Ne eivät toimi käyttöliittymässä.
- Käytä selkeitä otsikoita (## tai ###) ja lihavointia (**teksti**) korostamiseen.

### SÄÄNTÖ 2: KAKSI VASTAUSMOODIA

#### MOODI A: TIEDONHAKU JA OPASKÄYTTÖ (Yleiset kysymykset)
- KÄYTTÖ: Kun käyttäjä kysyy yleistä tietoa, määritelmiä tai ohjeita (esim. "Mikä on hyvä strategia?" tai "Mitä PESTEL-analyysiin kuuluu?").
- RAKENNE: Vastaa asiantuntevasti muutamalla kappaleella. Käytä listoja selkeyttämään asioita (esim. PESTELin kuusi kohtaa omina riveinään).
- EI ehdotus-rakennetta: Älä anna "Rakentavia ehdotuksia" (kuten "Varmistakaa että..."), jos käyttäjä ei ole esittänyt omaa suunnitelmaansa.

#### MOODI B: ANALYYSI JA HAASTAMINEN (Haasta valmis suunnitelma)
- KÄYTTÖ: Kun käyttäjä pyytää arvioimaan omaa suunnitelmaansa tai viesti sisältää analysoitavaa tekstiä (LTS/STR-konteksti).
- ALOITUS: "**Työstetään [Portaali]:n [Otsikko]-kohtaa:**"
- RAKENNE: Käytä listamuotoista rakennetta:
    1. **Huomio:** [Tiivis havainto logiikasta tai puutteesta]
    2. **Perustelu:** [Miksi tämä on tärkeää strategian kannalta]
    3. **Rakentava ehdotus:** [Konkreettinen toimenpide suunnitelman parantamiseksi]
- LÄHDEMATERIAALI: Kohdista analyysi erityisesti tiedostoihin "/LTS LIIKETOIMINTASUUNNITELMA ohje.pdf" tai "STRATEGIA ohje.pdf".

### OHJEET VASTAUKSEEN:
- Aloita suoraan asiasta.
- Pysy asiallisessa, suomalaisessa asiantuntijaroolissa.
- Jos LÄHDE-DATA on irrelevantti, pyydä kohteliaasti tarkentamaan haettavaa aihetta.

LÄHDE-DATA: "${context}"
    `;

    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      tools: [googleSearchTool],
      generationConfig: { temperature: 0.4 } 
    });

    const result = await generativeModel.generateContent({
      contents: [
        ...history,
        { role: "user", parts: [{ text: `${instructionText}\n\nKÄYTTÄJÄ: ${message}` }] }
      ]
    });

    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Virhe.";

    // --- 4. LASKURIN PÄIVITYS ---
    try {
      await usageRef.set({
        count: admin.firestore.FieldValue.increment(1),
        monthId: monthId,
        userId: uid
      }, { merge: true });
    } catch (e) { console.error(e); }

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
