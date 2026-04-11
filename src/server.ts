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
const LOCATION = "global"; // Discovery Engine (PDF-haku) sijainti
const ENGINE_ID = "lts-str_1775635155437"; 
const MODEL_LOCATION = "europe-west1"; // Geminin ja Google Searchin sijainti

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

    // --- LOGIIKKA 1: ANKKUROINTI JA PDF-HAKU ---
    let finalQuery = message;
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");

    if (isLTS) {
      const userTerm = message.replace(/^lts\s+/i, "").toLowerCase().trim();
      const LTS_STRUCTURE: { [key: string]: string } = {
        "yritysmuoto": "Yritysmuoto (sivu 1): Valinta ja suositukset.",
        "tausta": "Tausta (sivu 2): Osaaminen, kokemus ja vahvuudet.",
        "liikeidea": "Liikeidea (sivu 2): Mitä, miten ja kenelle?.",
        "strategia": "Strategia: Visio, arvot ja diagnoosi.",
        "miten": "Miten-osio: Kyvykkyydet (max 6) ja reagointi diagnoosiin."
        // ... voit lisätä loput aiemmasta listastasi tähän
      };
      finalQuery = `Etsi tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' tarkka ohje: ${LTS_STRUCTURE[userTerm] || userTerm}`;
    } 
    else if (isSTR) {
      const userTerm = message.replace(/^str\s+/i, "").toLowerCase().trim();
      const STR_STRUCTURE: { [key: string]: string } = {
        "yritykseni": "Yritykseni: Historia, nykytila ja päätuotteet.",
        "toimintaympäristö": "Toimintaympäristö: Ulkoinen analyysi ja diagnoosi.",
        "strategia": "Strategia: Visio, arvot ja reagointiresepti.",
        "miten": "Miten-osio: Kyvykkyydet ja reagointi diagnoosiin."
        // ... voit lisätä loput aiemmasta listastasi tähän
      };
      finalQuery = `Etsi tiedostosta 'STRATEGIA ohje.pdf' tarkka ohje: ${STR_STRUCTURE[userTerm] || userTerm}`;
    }

    // Suoritetaan haku Discovery Enginestä (Basic PDF Search)
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;
    
    const [searchResponse] = await searchClient.answerQuery({
      servingConfig,
      query: { text: finalQuery },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        includeCitations: true,
        answerLanguageCode: "fi",
      }
    });

    const pdfContent = searchResponse.answer?.answerText || "Ei löytynyt tarkkaa PDF-ohjetta.";

    // --- LOGIIKKA 2: SYNTEESI JA GOOGLE-HAKU (Gemini 2.0 Flash) ---
    // Tässä kohtaa yhdistetään PDF-löydökset ja tehdään verkkohaku
    
    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-2.0-flash-001",
      tools: [{ googleSearchRetrieval: {} } as any], 
    });

    const prompt = {
      contents: [{ 
        role: "user", 
        parts: [{ text: `
          Toimi sote-alan strategisena asiantuntijana. 
          
          KÄYTTÄJÄN KYSYMYS: "${message}"
          
          PDF-OHJEET (Datastore):
          ${pdfContent}
          
          TEHTÄVÄ:
          1. Tee syvällinen verkkohaku aiheesta vuoden 2026 perspektiivistä.
          2. Yhdistä yllä olevat PDF-ohjeet (jos ne liittyvät aiheeseen) ja verkkohaun tulokset.
          3. Ehdota teknisiä työkaluja tai prosesseja strategian tueksi.
          4. Jos kyseessä on LTS- tai STR-ohjeistus, varmista että vastaus noudattaa ohjeiden mukaista rakennetta.
          5. Vastaa suomeksi.
        `}] 
      }],
    };

    const result = await generativeModel.generateContent(prompt);
    const finalAnswer = result.response.candidates?.[0].content.parts?.[0].text || "Vastausta ei voitu muodostaa.";

    res.json({ 
      text: finalAnswer, 
      sessionId: searchResponse.session?.name // Säilytetään PDF-haun session ID
    });

  } catch (err: any) {
    console.error("VIRHE PALVELIMELLA:", err);
    res.status(500).json({ error: "Yhteysvirhe tekoälyyn. Yritä hetken kuluttua uudelleen." });
  }
});

// Staattisten tiedostojen tarjoilu (tuotanto)
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
  console.log(`🚀 Hybrid-Server käynnistetty porttiin ${PORT}`);
  console.log(`📍 PDF-haku: ${LOCATION}, Gemini: ${MODEL_LOCATION}`);
});
