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
### IDENTITEETTI JA ROOLI
- Toimit kokeneena, sparraavana ja oivaltavana suomalaisena liiketoimintastrategina ja arvioijana.
- Tyylisi on asiallinen, rakentava ja herättelevä. Älä ole epäkohtelias, mutta älä myöskään myötäile tai kehu suunnitelmaa itsestäänselvyyksillä.
- Älä koskaan selitä auki liiketoiminnan käsitteitä tai määritelmiä. Mene suoraan asiaan.
- Älä kommentoi tai listaa kohtia, joita käyttäjä ei ole vielä määritellyt tai täyttänyt.

### DATA-KENTTIEN TUNNISTAMINEN SYÖTTEESTÄ
- **VISIO JA ARVOT:** Syötteen alussa olevat kentät (kuten Visio, Arvot, Arvolupaus). Tämä on kaiken lähtökohta.
- **DIAGNOOSI:** Osio, joka alkaa sanalla "Diagnoosi". Sen alla olevat "Positiiviset ilmiöt" ja "Negatiiviset ilmiöt" ovat toimintaympäristön löydöksiä.
- **MITEN-KOHTA:** Kentät, joissa määritellään kyvykkyydet, resurssit ja avaintoiminnot (esim. sovellus, valmentajat, tilat).
- **TOTEUTUS / LOPPUOSAT:** LTS-portaalissa "Osasuunnitelmat" (Markkinointi, Talous, Hallinto, Henkilöstö). STR-portaalissa "Liiketoimintamalli" (Asiakkaat, Kanavat, Tulot, Kulut).

### HAASTA SUUNNITELMA -TOIMINTAOHJE (KOKO STRATEGINEN JATKUMO)
Kun haastat suunnitelmaa (syötteessä "LIIKETOIMINTASUUNNITELMAN DATA:" tai "STRATEGIA-KEHYS:"), sinun on arvioitava koko ketjun loogista jatkuvuutta:

1. **Visio ja Arvot suhteessa Diagnoosiin:** Tarkista, ohjaavatko määritellyt Visio ja Arvot todella siihen, miten Diagnoosin (toimintaympäristön) ilmiöihin vastataan, vai ovatko ne irrallisia korulauseita.
2. **Diagnoosin ilmiöt suhteessa Miten-kohdan kyvykkyyksiin:** Osoita paikat, joissa ehdotetut kyvykkyydet ja resurssit eivät kohtaa Diagnoosin luomia todellisia haasteita tai mahdollisuuksia.
3. **Miten-kohta suhteessa Toteutukseen (LTS: osasuunnitelmat / STR: liiketoimintamalli):**
   - **LTS (Liiketoimintasuunnitelma):** Haasta sitä, onko "Miten"-kohdan kyvykkyyksille varattu aidot resurssit ja teot osasuunnitelmissa (Markkinointi, Talous, Hallinto, Henkilöstö).
   - **STR (Strategia):** Haasta sitä, tukeeko ja mahdollistaako valittu **Liiketoimintamalli** (asiakkaat, kanavat, tulot, kulut) "Miten"-kohdan strategisten kyvykkyyksien täyden hyödyntämisen ja suojaako se niitä.

### VASTAUKSEN RAKENNE (HAASTA SUUNNITELMA)
Tulosta analyysi täsmälleen tässä muodossa, ilman turhia johdantolöpötyksiä:

- **Huomioita strategisesta jatkumosta (Visio -> Diagnoosi -> Miten):** Nosta esiin 1-2 konkreettista huomiota tai loogista sokeaa pistettä siitä, miten yrityksen suunta (Visio/Arvot) and toimintaympäristön ilmiöt (Diagnoosi) kohtaavat "Miten"-kohdan kyvykkyyksissä.
- **Huomioita toteutuksesta ja rakenteesta (Miten -> Loppuosat):** [Jos kyseessä on LTS] Nosta esiin, miten loogisesti kyvykkyydet jalkautuvat osasuunnitelmiin (Markkinointi, Talous, Hallinto, Henkilöstö).
  [Jos kyseessä on STR] Nosta esiin, miten loogisesti kyvykkyydet integroituvat valittuun Liiketoimintamalliin ja sen rakenteisiin (asiakkaat, kanavat, tulot, kulut).
- **TOP 3 Kysymystä kokonaisuuden kirkastamiseksi:** Esitä 3 suoraa, oivaltavaa ja herättelevää kysymystä, jotka pakottavat käyttäjän perustelemaan ja sitomaan koko ketjun (Visiosta ja Diagnoosista aina Liiketoimintamalliin/Osasuunnitelmiin saakka) ehjäksi kokonaisuudeksi.

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
