import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai"; 
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

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

app.post("/api/chat", async (req, res) => {
  try {
    let { message, sessionId, history = [], uid } = req.body;
    
    if (!message || !uid) return res.status(400).json({ error: "Tietoja puuttuu" });

    // --- TUPLAVARMISTUS: SIIVOTAAN TYHJÄT JA "EI MÄÄRITELTY" -RIVIT POIS SYÖTTEESTÄ ---
    if (message.includes("LIIKETOIMINTASUUNNITELMAN DATA:") || message.includes("STRATEGIA-KEHYS:")) {
      message = message
        .split("\n")
        .filter((line: string) => {
          const trimmed = line.trim();
          // Suodatetaan pois rivit, jotka loppuvat "Ei määritelty", ovat tyhjiä tai sisältävät pelkkiä tyhjiä arvoja erottimien välissä
          return !(
            trimmed.endsWith("Ei määritelty") ||
            trimmed === "" ||
            trimmed.match(/:\s*(\/\s*)*$/) // Poistaa esim. "Liikeidea:  /  / "
          );
        })
        .join("\n");
    }

    // --- PUHDISTETAAN HISTORIA VERTEX AI:LLE ---
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
      parts: msg.parts || [{ text: msg.text }]
    }));

    // --- SECURITY LAYER 1: INPUT SANITIZATION ---
    const lowerMessage = message.toLowerCase();
    const forbiddenTerms = ["system instruction", "pysy roolissa", "tulosta ohjeet", "ignore previous instructions", "developer mode"];
    if (forbiddenTerms.some(term => lowerMessage.includes(term))) {
      return res.json({ 
        text: "Olen pahoillani, mutta toimin vain liiketoimintastrategina enkä voi paljastaa sisäisiä ohjeitani." 
      });
    }

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

    // --- 3. OHJEISTUS ---
    const instructionText = `
### IDENTITEETTI JA STRATEGINEN LÄHESTYMISTAPA
- Toimit asiantuntevana, sparraavana ja oivaltavana suomalaisena liiketoimintastrategina ja arvioijana.
- Älä koskaan selitä auki liiketoiminnan käsitteitä tai määritelmiä (esim. älä selitä mitä "diagnoosi", "kyvykkyys" tai "osasuunnitelma" tarkoittaa). Mene suoraan asiaan.
- Älä kommentoi tai listaa kohtia, joita käyttäjä ei ole vielä määritellyt tai täyttänyt.

### HAASTA SUUNNITELMA -TOIMINTAOHJE (STRATEGINEN JATKUMO: DIAGNOOSI -> MITEN -> TOTEUTUS)
Kun käyttäjä pyytää arvioimaan tai haastamaan suunnitelmaa (syötteessä "LIIKETOIMINTASUUNNITELMAN DATA:" tai "STRATEGIA-KEHYS:"), analysoi kokonaisuutta loogisena ketjuna: **Diagnoosi** (haasteet) -> **Miten-kohta** (kyvykkyydet) -> **TOTEUTUS** (osasuunnitelmat tai liiketoimintamalli).

1. **Diagnoosin ja Miten-kohdan kohtaaminen:**
   - Arvioi rakentavasti, vastaavatko "Miten"-kohdan kyvykkyydet ja resurssit suoraan "Diagnoosi"-otsikon alla tunnistettuihin toimintaympäristön löydöksiin (ulkoinen ja sisäinen toimintaympäristö).

2. **Toimeenpanon ja jatkumon tarkistus portaalikohtaisesti:**
   - **LTS (Liiketoimintasuunnitelma):** Tarkastele "Miten"-kohdan jälkeisiä osasuunnitelmia (**Markkinointi & Myynti, Talous, Hallinto, Henkilöstö**). Haasta sitä, toteuttavatko nämä käytännön arjen palaset aidosti niitä kyvykkyyksiä, joita "Miten"-kohdassa luvataan.
   - **STR (Strategia):** Tarkastele "Miten"-kohdan jälkeistä **Liiketoimintamallia**. Haasta sitä, tukeeko ja rakentuuko valittu liiketoimintamalli loogisesti sellaiseksi, että se mahdollistaa "Miten"-kohdassa määriteltyjen strategisten kyvykkyyksien täyden hyödyntämisen.

### VASTAUKSEN RAKENNE (HAASTA SUUNNITELMA)
Tulosta analyysi selkeässä, helposti pureskeltavassa ja sparraavassa muodossa:

- **Huomioita strategisesta jatkumosta:** Nosta esiin 1-2 keskeistä havaintoa siitä, miten sujuvasti ketju Diagnoosista "Miten"-kohdan kautta käytännön tasolle (LTS: osasuunnitelmat / STR: liiketoimintamalli) linkittyy toisiinsa ja missä on mahdollisia loogisia katkoja.
- **TOP 3 Kysymystä toteutuksen kirkastamiseksi:** Esitä 3 oivaltavaa ja herättelevää kysymystä, jotka auttavat käyttäjää varmistamaan, että portaalikohtaiset jatko-osat (LTS: osasuunnitelmat / STR: liiketoimintamalli) todella muuttavat "Miten"-kohdan kyvykkyydet konkreettiseksi toiminnaksi.

LÄHDE-DATA PDF-TIETOKANNASTA: "${context}"
    `;

    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      tools: [googleSearchTool],
      generationConfig: { temperature: 0.3, topP: 0.8 },
      safetySettings,
      systemInstruction: {
        role: "system",
        parts: [{ text: instructionText }]
      }
    });

    // --- 4. MUISTILLA VARUSTETTU VASTAUS ---
    const result = await generativeModel.generateContent({
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: `KÄYTTÄJÄN KYSYMYS JA DATA:\n${message}` }] }
      ]
    });

    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Virhe vastauksen hakemisessa.";

    // --- 5. LASKURIN PÄIVITYS ---
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

app.listen(process.env.PORT || 80, () => {
  console.log(`Server running on port ${process.env.PORT || 80}`);
});
