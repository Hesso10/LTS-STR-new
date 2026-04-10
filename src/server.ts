// src/server.ts
import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Google Cloud Konfiguraatio
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 

const client = new ConversationalSearchServiceClient();

app.post("/api/chat", async (req, res) => {
  try {
    let { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const cleanMsg = message.toUpperCase();
    
    // 1. META-LOGIIKKA: Mahdollistetaan chatin ohjeistaminen lennosta
    const isDirectInstruction = cleanMsg.startsWith("OHJE:") || cleanMsg.includes("TOIMI JATKOSSA");
    if (isDirectInstruction) {
      message = `[KÄYTTÄJÄN OHJEISTUS: ${message}]. Huomioi tämä ohje vastauksessasi ja vahvista ymmärryksesi.`;
    }

    // 2. LOGIIKKA: Strategia-valikko hyvin lyhyille viesteille
    const isGenericSTR = cleanMsg === "STR" || cleanMsg === "STR STRATEGIA" || cleanMsg === "STRATEGIA";
    if (isGenericSTR) {
      return res.json({
        text: "Strategia-osio on laaja kokonaisuus. Haluaisitko lähteä liikkeelle jostakin näistä?\n\n" +
              "* **Visio**: Aikaan sidottu päätavoite.\n" +
              "* **Arvot**: Toiminnan eettinen perusta.\n" +
              "* **Diagnoosi**: Nykytilan ja ympäristön analyysi.\n" +
              "* **Miten (Kyvykkyydet)**: Toimenpiteet diagnoosiin vastaamiseksi.\n\n" +
              "Kerro minulle, mitä näistä työstät, niin pohditaan sitä tarkemmin.",
        sessionId: sessionId 
      });
    }

    // 3. AGGRESSIIVINEN HAKUKYNNYS: 
    // Lasketaan kynnystä (threshold) kaikilla avainsanoilla tai lyhyillä kysymyksillä, 
    // jotta Google Search aktivoituu aina kun Datastore ei ole 100% varma.
    const isDefinition = cleanMsg.includes("MIKÄ") || cleanMsg.includes("MITÄ") || cleanMsg.length < 30;
    const searchThreshold = (cleanMsg.includes("LTS") || cleanMsg.includes("STR") || cleanMsg.includes("MITEN") || isDefinition) ? 0.005 : 0.05;

    // 4. TIUKKA HAKUSTRATEGIA (PREAMBLE)
    const preamble = `
      Olet asiantunteva suomalainen liiketoimintakonsultti. Tyylisi on analyyttinen, rauhallinen ja asiallinen.

      HAKUSTRATEGIA (ERITTÄIN TÄRKEÄ):
      1. JOS vastaus ei löydy Data Storesta, suuntaa haku välittömästi Googleen.
      2. KÄYTÄ haussa asiantuntijakontekstia: Etsi laadukkaita lähteitä (kuten McKinsey, HBR, Gartner, Deloitte, PwC, Strategy&).
      3. ÄLÄ KOSKAAN vastaa "Yhteenvetoa ei voitu luoda". Jos suoraa vastausta ei löydy kummastakaan lähteestä, muodosta asiantunteva vastaus yleisen liiketoimintaosaamisesi perusteella ja selitä käsitteet (kuten "kyvykkyys") selkeästi.
      
      TOIMINTATAPA:
      - Vastaa VAIN siihen mitä kysytään (vähemmän on enemmän).
      - Jos kysytään kyvykkyyksistä, selitä ne prosessien, ihmisten ja teknologian yhdistelmänä.
      - Käytä suomea, asiallista kieltä ja tuplarivivaihtoa kappaleiden välillä.
      - ÄLÄ käytä termejä "Hessonpaja" tai "kokenut".

      LOPETA JOKAINEN VASTAUS NÄIN:
      ---
      **Ehdotukset jatkoaskeliksi:**
      * [Lyhyt, asiallinen jatkokysymys tästä aiheesta]
      * [Konkreettinen näkökulma, joka syventää tätä kohtaa]
    `;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        promptSpec: { preamble },
        includeCitations: true,
        answerLanguageCode: "fi",
      },
      contentSearchSpec: {
        summaryResultCount: 5,
        googleSearchSpec: {
          dynamicRetrievalConfig: { 
            predictor: { threshold: searchThreshold } 
          } 
        }
      }
    });

    // Fallback-vastaus kooditasolla, jos AI palauttaa tyhjää
    res.json({ 
      text: response.answer?.answerText || "Portaalin ohjeista ei löytynyt suoraa vastausta, mutta yleisesti ottaen tätä aihetta kannattaa lähestyä asiantuntijanäkökulmasta näin...",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("Vertex AI Error:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, "index.html"));
  }
});

const PORT = process.env.PORT || 8080;
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Palvelin käynnissä portissa ${PORT}`);
});
