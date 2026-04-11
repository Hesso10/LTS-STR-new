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
const LOCATION = "global"; // Discovery Engine (PDF-haku)
const ENGINE_ID = "lts-str_1775635155437"; 
// Vaihdettu sijainti Eurooppaan yhteensopivuuden ja nopeuden vuoksi
const MODEL_LOCATION = "europe-west1"; 

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
    // Tämä osio ohittaa Discovery Enginen rajoitukset ja käyttää suoraa Google-hakua
    if (isWEB) {
      console.log("Suoritetaan: ITSENÄINEN GEMINI 2.0 FLASH HAKU (europe-west1)");
      const querySubject = message.replace(/^web\s+/i, "").trim();
      
      const generativeModel = vertexAI.getGenerativeModel({
        model: "gemini-2.0-flash-001", // Paneelissasi valittu Gemini 2.0 Flash
        tools: [{ googleSearchRetrieval: {} } as any], 
      });

      const result = await generativeModel.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: `Toimi sote-alan strategisena asiantuntijana. Tee syvällinen ja ajantasainen verkkohaku aiheesta: ${querySubject}. Analysoi ilmiöt vuoden 2026 perspektiivistä ja ehdota tarvittavia teknisiä työkaluja tai prosesseja strategian 'Miten'-osion (kyvykkyydet) tueksi. Vastaa suomeksi.` }] 
        }],
      });

      const finalAnswer = result.response.candidates?.[0].content.parts?.[0].text || "Hakua ei voitu suorittaa.";
      return res.json({ text: finalAnswer, sessionId });
    }

    // --- LOGIIKKA 2: ANKKUROITU PDF-HAKU (Discovery Engine Basic) ---
    let finalQuery = message;
    let currentThreshold = 0.05;

    if (isLTS) {
      console.log("Suoritetaan: LTS-ANKKUROINTI");
      const userTerm = message.replace(/^lts\s+/i, "").toLowerCase().trim();
      const LTS_STRUCTURE: { [key: string]: string } = {
        "yritysmuoto": "Yritysmuoto (sivu 1): Valinta ja suositukset.",
        "tausta": "Tausta (sivu 2): Osaaminen, kokemus ja vahvuudet.",
        "liikeidea": "Liikeidea (sivu 2): Mitä, miten ja kenelle?.",
        "toimintaympäristö": "Ulkoisen toimintaympäristön analyysi: PESTEL-malli.",
        "kilpailutilanne": "Kilpailutilanne: Markkina-alue ja kilpailijat.",
        "asiakkaat": "Asiakkaat: Markkinakoko ja profiilit.",
        "sisäinen ympäristö": "Sisäinen toimintaympäristö: Tehokkuus ja osa-alueet.",
        "strategia": "Strategia: Visio, arvot ja diagnoosi.",
        "miten": "Miten-osio: Kyvykkyydet (max 6) ja reagointi diagnoosiin.",
        "markkinointi": "Myynti & markkinointi: Kohderyhmät ja kanavat.",
        "laskelmat": "Laskelmat: Vuosibudjetti ja myyntitavoitteet.",
        "henkilöstö": "Henkilöstö: Resurssit ja osaaminen.",
        "toteutus": "Toteutus: Aikataulutus ja jalkautus."
      };
      finalQuery = `Etsi tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' tarkka ohje: ${LTS_STRUCTURE[userTerm] || userTerm}`;
      currentThreshold = 0.4;
    } 
    else if (isSTR) {
      console.log("Suoritetaan: STR-ANKKUROINTI");
      const userTerm = message.replace(/^str\s+/i, "").toLowerCase().trim();
      const STR_STRUCTURE: { [key: string]: string } = {
        "yritykseni": "Yritykseni: Historia, nykytila ja päätuotteet.",
        "organisaatio": "Organisaatiorakenne: Nykyinen rakenne.",
        "toimintaympäristö": "Toimintaympäristö: Ulkoinen analyysi ja diagnoosi.",
        "kilpailutilanne": "Kilpailutilanne: Kilpailijaprofiilit.",
        "asiakkaat": "Asiakkaat: Markkinakoko ja kohderyhmät.",
        "sisäinen ympäristö": "Sisäinen toimintaympäristö: Plussat ja miinukset.",
        "strategia": "Strategia: Visio, arvot ja reagointiresepti.",
        "miten": "Miten-osio: Kyvykkyydet ja reagointi diagnoosiin.",
        "liiketoimintamalli": "Liiketoimintamalli: Taktiikka ja resurssit.",
        "arvolupaus": "Arvolupaus: Asiakashyöty ja tuotteet.",
        "kanavat": "Kanavat: Asiakaspolku ja markkinointi.",
        "resurssit": "Tärkeimmät resurssit: Aineelliset ja aineettomat.",
        "aktiviteetit": "Tärkeimmät aktiviteetit: Toimenpiteet.",
        "tulot": "Tulot: Rahavirran logiikka ja ansaintamallit.",
        "kustannukset": "Kustannukset: Strategiset hankkeet.",
        "projekti": "Projektini: Strategian vieminen työnkuvaan."
      };
      finalQuery = `Etsi tiedostosta 'STRATEGIA ohje.pdf' tarkka ohje: ${STR_STRUCTURE[userTerm] || userTerm}`;
      currentThreshold = 0.4;
    }

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
    console.error("VIRHE PALVELIMELLA:", err);
    // Tulostetaan tarkempi virhekoodi lokeihin
    if (err.code) console.error("Virhekoodi:", err.code);
    res.status(500).json({ error: "Yhteysvirhe tekoälyyn. Yritä hetken kuluttua uudelleen." });
  }
});

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
  console.log(`🚀 LTS-STR-new Server käynnistetty porttiin ${PORT}`);
  console.log(`📍 Sijainti: ${MODEL_LOCATION}, Malli: gemini-2.0-flash-001`);
});
