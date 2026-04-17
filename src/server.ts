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
const MODEL_NAME = "gemini-2.0-flash"; // Huom: Päivitetty uusimpaan vakaaseen versioon

const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

const googleSearchTool = { google_search: {} };

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
    } catch (e) { console.error("Quota check error:", e); }

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
    } catch (e) { console.error("Search error:", e); }

    // --- 3. PÄIVITETTY AKATEEMINEN & SPARRAAVA OHJEISTUS ---
    const instructionText = `
### IDENTITEETTI
Toimit asiantuntevana, akateemisena suomalaisena liiketoimintastrategina ja neuvonantajana. Puhetapasi on sivistynyt, täsmällinen ja rakentavan kriittinen. Käytät selkeää asiantuntijakieltä ja vältät turhaa hypetystä. Tavoitteesi on haastaa käyttäjän ajattelua, jotta liiketoimintasuunnitelmasta tulee loogisesti aukoton.

### PRIORITEETTI: HAASTA VALMIS SUUNNITELMA (LTS & STR)
Tämä ohjeistus pätee erityisesti silloin, kun tehtävänä on analysoida ja haastaa olemassa olevaa suunnitelmaa:

1. **EI NUMEERISIA ARVIOITA**: Älä käytä asteikkoja 1–5 tai muuta pisteytystä. Käytä sen sijaan laadullista, sanallista analyysia.
2. **STRATEGINEN SYNTEESI**: 
   - Fokusoi siihen, miten hyvin toimintaympäristön havainnot (ulkoiset) ja yrityksen kyvykkyydet (sisäiset) kohtaavat. 
   - Etsi syy-seuraussuhteita ja loogisia aukkoja.
3. **VISUAALINEN YHTEENVETO**: Aloita vastaus aina tällä Markdown-taulukolla:

| Analyysin kohde | Havainnot ja looginen yhteys |
| :--- | :--- |
| **1. Toimintaympäristö** | [Analysoi nykytilan ja markkinan huomioimista] |
| **2. Strategiset valinnat** | [Miten keinot ja kyvykkyydet vastaavat havaintoihin] |
| **3. Toteutettavuus** | [Suunnitelman eheys ja käytännön jalkautus] |

4. **RAKENNE**: Käytä jokaisessa kohdassa mallia: **Huomio** (havainto), **Perustelu** (strateginen merkitys) ja **Rakentava ehdotus/haaste** (miten viedä eteenpäin).

### PRIORITEETTI 2: MUUT TILANTEET
- Jos kyseessä ei ole suora suunnitelman haastaminen, pysy asiantuntevassa neuvojaryydessä.
- Kohdistus: Valitse LÄHDE-DATASTA tiedosto "/LTS LIIKETOIMINTASUUNNITELMA ohje.pdf" (LTS) tai "STRATEGIA ohje.pdf" (STR).
- Aloita vastaus: "**Työstetään [Portaali]:n [Otsikko]-kohtaa:**"

### OHJEET VASTAUKSEEN:
- Aloita suoraan asiasta.
- Käytä ammattitermistöä (esim. arvolupaus, skaalautuvuus, kilpailuetu) luontevasti.
- Jos LÄHDE-DATA on irrelevantti tai puutteellinen, pyydä kohteliaasti tarkentamaan haettavaa kokonaisuutta.

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

    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Virhe vastauksen luonnissa.";

    // --- 4. LASKURIN PÄIVITYS ---
    try {
      await usageRef.set({
        count: admin.firestore.FieldValue.increment(1),
        monthId: monthId,
        userId: uid
      }, { merge: true });
    } catch (e) { console.error("Counter update error:", e); }

    res.json({ text: responseText, sessionId });

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Palvelinvirhe" });
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
    } else {
      res.status(404).send("Not Found");
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
