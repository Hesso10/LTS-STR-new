// src/server.ts
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
const MODEL_LOCATION = "us-central1"; // Gemini 2.0 Flash on vakain tällä alueella

// 1. Alustetaan asiakkaat
const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();
    console.log("\n--- UUSI PYYNTÖ ---");
    console.log("Käyttäjän syöte:", message);

    // 2. TUNNISTUS: WEB, LTS, STR
    const isWEB = msgLower.startsWith("web");
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    // --- LOGIIKKA 1: ITSENÄINEN WEB-HAKU (Gemini 2.0 Flash) ---
    // Tämä ohittaa Discovery Enginen Basic-tason rajoitukset
    if (isWEB) {
      console.log("Suoritetaan: ITSENÄINEN GEMINI 2.0 FLASH HAKU");
      const querySubject = message.replace(/^web\s+/i, "").trim();
      
      const generativeModel = vertexAI.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        tools: [{ googleSearchRetrieval: {} } as any], 
      });

      const result = await generativeModel.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: `Toimi sote-alan strategisena asiantuntijana. Tee syvällinen ja ajantasainen verkkohaku aiheesta: ${querySubject}. Analysoi ilmiöt ja ehdota tarvittavia teknisiä työkaluja tai prosesseja strategian 'Miten'-osion tueksi. Vastaa suomeksi.` }] 
        }],
      });

      const finalAnswer = result.response.candidates?.[0].content.parts?.[0].text || "Hakua ei voitu suorittaa.";
      return res.json({ text: finalAnswer, sessionId });
    }

    // --- LOGIIKKA 2: ANKKUROITU PDF-HAKU (Discovery Engine) ---
    let finalQuery = message;
    let currentThreshold = 0.05;

    if (isLTS) {
      console.log("Suoritetaan: LTS-ANKKUROINTI");
      const userTerm = message.replace(/^lts\s+/i, "").toLowerCase().trim();
      const LTS_STRUCTURE: { [key: string]: string } = {
        "yritysmuoto": "Yritysmuoto (sivu 1): Valinta ja suositukset[cite: 14, 15, 17].",
        "tausta": "Tausta (sivu 2): Osaaminen, kokemus ja vahvuudet[cite: 20, 22, 25].",
        "liikeidea": "Liikeidea (sivu 2): Mitä, miten ja kenelle?[cite: 30, 32, 33].",
        "toimintaympäristö": "Ulkoisen toimintaympäristön analyysi: PESTEL-malli[cite: 39, 53, 54].",
        "kilpailutilanne": "Kilpailutilanne: Markkina-alue ja kilpailijat[cite: 88, 89].",
        "asiakkaat": "Asiakkaat: Markkinakoko ja profiilit[cite: 91, 92, 98].",
        "sisäinen ympäristö": "Sisäinen toimintaympäristö: Tehokkuus ja osa-alueet[cite: 99, 106, 110].",
        "strategia": "Strategia: Visio, arvot ja diagnoosi[cite: 119, 121, 126].",
        "miten": "Miten-osio: Kyvykkyydet (max 6) ja reagointi diagnoosiin[cite: 129, 131, 132].",
        "markkinointi": "Myynti & markkinointi: Kohderyhmät ja kanavat[cite: 138, 139, 146].",
        "laskelmat": "Laskelmat: Vuosibudjetti ja myyntitavoitteet[cite: 151, 154].",
        "henkilöstö": "Henkilöstö: Resurssit ja osaaminen[cite: 157, 158].",
        "toteutus": "Toteutus: Aikataulutus ja jalkautus[cite: 161, 162]."
      };
      finalQuery = `Etsi tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' tarkka ohje: ${LTS_STRUCTURE[userTerm] || userTerm}`;
      currentThreshold = 0.4;
    } 
    else if (isSTR) {
      console.log("Suoritetaan: STR-ANKKUROINTI");
      const userTerm = message.replace(/^str\s+/i, "").toLowerCase().trim();
      const STR_STRUCTURE: { [key: string]: string } = {
        "yritykseni": "Yritykseni: Historia, nykytila ja päätuotteet[cite: 164, 165, 166].",
        "organisaatio": "Organisaatiorakenne: Nykyinen rakenne[cite: 169].",
        "toimintaympäristö": "Toimintaympäristö: Ulkoinen analyysi ja diagnoosi[cite: 170, 171, 180].",
        "kilpailutilanne": "Kilpailutilanne: Kilpailijaprofiilit[cite: 223, 226].",
        "asiakkaat": "Asiakkaat: Markkinakoko ja kohderyhmät[cite: 227, 235].",
        "sisäinen ympäristö": "Sisäinen toimintaympäristö: Plussat ja miinukset[cite: 236, 238, 244].",
        "strategia": "Strategia: Visio, arvot ja reagointiresepti[cite: 257, 259, 260].",
        "miten": "Miten-osio: Kyvykkyydet ja reagointi diagnoosiin[cite: 267, 269, 270].",
        "liiketoimintamalli": "Liiketoimintamalli: Taktiikka ja resurssit[cite: 275, 276, 277].",
        "arvolupaus": "Arvolupaus: Asiakashyöty ja tuotteet[cite: 282, 283].",
        "kanavat": "Kanavat: Asiakaspolku ja markkinointi[cite: 284, 285, 287].",
        "resurssit": "Tärkeimmät resurssit: Aineelliset ja aineettomat[cite: 292, 293, 299].",
        "aktiviteetit": "Tärkeimmät aktiviteetit: Toimenpiteet[cite: 300, 301, 304].",
        "tulot": "Tulot: Rahavirran logiikka ja ansaintamallit[cite: 309, 310, 312].",
        "kustannukset": "Kustannukset: Strategiset hankkeet[cite: 313, 314, 315].",
        "projekti": "Projektini: Strategian vieminen työnkuvaan[cite: 319, 320]."
      };
      finalQuery = `Etsi tiedostosta 'STRATEGIA ohje.pdf' tarkka ohje: ${STR_STRUCTURE[userTerm] || userTerm}`;
      currentThreshold = 0.4;
    }

    // Suoritetaan haku Discovery Enginestä
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await searchClient.answerQuery({
      servingConfig,
      query: { text: finalQuery },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        promptSpec: { preamble: "Olet sote-alan strategiakonsultti. Vastaa tarkasti annettujen PDF-ohjeiden perusteella portaalin täyttäjälle." },
        includeCitations: true,
        answerLanguageCode: "fi",
      },
      contentSearchSpec: {
        summaryResultCount: 5,
        googleSearchSpec: { dynamicRetrievalConfig: { predictor: { threshold: currentThreshold } } }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Vastausta ei saatu.",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("VIRHE:", err);
    res.status(500).json({ error: "Yhteysvirhe tekoälyyn." });
  }
});

// Staattiset tiedostot Cloud Runia varten
const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 LTS-STR-new Server running on port ${PORT}`);
});
