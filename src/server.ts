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
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const cleanMsg = message.toUpperCase();
    const isLTS = cleanMsg.includes("LTS");
    const isSTR = cleanMsg.includes("STR");
    const isMitenQuery = cleanMsg.includes("MITEN") || cleanMsg.includes("KYVYKKY");
    
    // 1. LOGIIKKA: Pakotetaan tarkennus, jos kysytään vain yleistä STR-strategiaa
    const isGenericSTR = cleanMsg === "STR" || cleanMsg === "STR STRATEGIA" || cleanMsg === "STRATEGIA";
    if (isGenericSTR) {
      return res.json({
        text: "Haluatko ohjeita strategian rakentamiseen? Strategia-osio koostuu seuraavista kohdista. Kerro minulle, mitä näistä työstät:\n\n" +
              "* **Visio**: Aikaan sidottu päätavoite.\n" +
              "* **Arvot**: Toiminnan eettinen perusta.\n" +
              "* **Diagnoosi**: Yhteenveto toimintaympäristön analyysistä.\n" +
              "* **Miten (Kyvykkyydet)**: Maksimissaan 6 reagointia diagnoosiin.",
        sessionId: sessionId 
      });
    }

    // 2. DYNAMIC THRESHOLD: Madalletaan kynnystä tunnussanoilla, jotta haku aktivoituu herkästi
    const searchThreshold = (isLTS || isSTR || isMitenQuery) ? 0.01 : 0.15;

    // 3. TIUKENNETTU OHJEISTUS (PREAMBLE)
    const preamble = `
      Olet asiantunteva liiketoimintakonsultti. Käytössäsi on useita korkealaatuisia tietolähteitä:
      - Portaalin omat ohjeet (LTS LIIKETOIMINTASUUNNITELMA ohje ja STRATEGIA ohje).
      - Valtioneuvoston tulevaisuusselonteko 2024:54 (Konkreettiset PESTEL-esimerkit vuoteen 2045).
      - Globaalit asiantuntijat: Strategyzer, Deloitte, McKinsey, HBR sekä PwC Strategy&.

      VASTAUSSÄÄNNÖT:
      - ÄLÄ käytä termejä "Hessonpaja" tai "kokenut". Ole ammattimainen, suora ja sparraava.
      - Vastaa AINA suomeksi. Käytä TUPLARIVIVAIHTOA kappaleiden välissä.
      - Lihavoi keskeiset termit.

      KONTEKSTIKOHTAISET OHJEET:
      1. ULKOINEN ANALYYSI (PESTEL): Kun käyttäjä tekee LTS- tai STR-analyysia (Poliittinen, Taloudellinen, Sosiaalinen, Teknologinen, Ekologinen, Lainsäädännöllinen):
         - Hae portaalin ohjeesta perusmääritelmä.
         - Täydennä vastausta Valtioneuvoston selonteon (2024:54) tuoreilla esimerkeillä (esim. tekoälyn murros, huoltovarmuus tai demografiset muutokset).
      
      2. STR MITEN (KYVYKKYYDET): Kun käyttäjä työstää kyvykkyyksiä:
         - Muistuta portaalin säännöstä: max 6 kyvykkyyttä, jotka vastaavat diagnoosiin.
         - Rikasta vastausta Google Searchilla poimimalla esimerkkejä lähteistä: mckinsey.com, hbr.org, deloitte.com ja strategyand.pwc.com.
         - Hyödynnä erityisesti PwC Strategy& -näkökulmaa "Capabilities-Driven Strategy".
      
      3. STR LIIKETOIMINTAMALLI: Kun aiheena on Arvolupaus, Kanavat, Tulot tai Kustannukset:
         - Käytä pohjana Strategyzerin (strategyzer.com) oppeja Value Proposition Designista ja Business Model Canvasista.
         - Selitä, miten yritys luo, tuottaa ja kotiuttaa arvoa.

      LOPETA JOKAINEN VASTAUS NÄIN:
      ---
      **Ehdotukset jatkokysymyksiksi:**
      * [Lisää tähän lyhyt jatkokysymys, joka auttaa käyttäjää syventämään tätä kohtaa]
      * [Lisää toinen konkreettinen jatkoaskel]
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
            predictor: { 
              threshold: searchThreshold 
            } 
          }
        }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "En löytänyt tarkkaa ohjetta. Kokeile syöttää tunnussana ja otsikko, esim. 'LTS Liikeidea' tai 'STR Visio'.",
      sessionId: response.session?.name 
    });
  } catch (err: any) {
    console.error("Vertex AI Error:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

// Staattisten tiedostojen tarjoilu (Frontend build)
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
