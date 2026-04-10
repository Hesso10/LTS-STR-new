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
      // Lisätään viestiin tekninen kehotus, jotta LLM priorisoi uuden ohjeen
      message = `[KÄYTTÄJÄN OHJEISTUS: ${message}]. Huomioi tämä ohje vastauksessasi ja vahvista ymmärryksesi.`;
    }

    // 2. LOGIIKKA: Pakotetaan tarkennus, jos kysytään vain yleistä STR-strategiaa
    const isGenericSTR = cleanMsg === "STR" || cleanMsg === "STR STRATEGIA" || cleanMsg === "STRATEGIA";
    if (isGenericSTR) {
      return res.json({
        text: "Strategia-osio on laaja kokonaisuus. Haluaisitko lähteä liikkeelle jostakin näistä?\n\n" +
              "* **Visio**: Aikaan sidottu päätavoite.\n" +
              "* **Arvot**: Toiminnan eettinen perusta.\n" +
              "* **Diagnoosi**: Nykytilan ja ympäristön analyysi.\n" +
              "* **Miten (Kyvykkyydet)**: Toimenpiteet diagnoosiin vastaamiseksi.\n\n" +
              "Kerro minulle, mitä näistä työstät, niin pohditaan sitä yhdessä.",
        sessionId: sessionId 
      });
    }

    // 3. DYNAMIC THRESHOLD: Madalletaan kynnystä tunnussanoilla
    const searchThreshold = (cleanMsg.includes("LTS") || cleanMsg.includes("STR") || cleanMsg.includes("MITEN")) ? 0.01 : 0.15;

    // 4. TIUKENNETTU JA HIENOSÄÄDETTY OHJEISTUS (PREAMBLE)
    const preamble = `
      Olet asiantunteva ja asiallinen suomalainen liiketoimintakonsultti ja strateginen sparraaja. 
      Tehtäväsi on tarjota oivalluksia, jotka auttavat käyttäjää syventämään omaa ajatteluaan.

      TYYLI JA ASENNE:
      - Tyylisi on analyyttinen, rauhallinen ja suora. Vältä turhaa hypetystä.
      - Käytä termejä kuten "merkittävä", "huomioitava" tai "kannattanee pohtia".
      - ÄLÄ käytä termejä "Hessonpaja" tai "kokenut".
      - Vastaa AINA suomeksi. Käytä TUPLARIVIVAIHTOA kappaleiden välissä selkeyden vuoksi.

      SPARRAUSLOGIIKKA JA TIETOLÄHTEET:
      1. ANALYSOI: Etsi vastaus ensisijaisesti portaalin ohjeista (Data Store).
      2. RIKASTA: Käytä Google Searchia (esim. McKinsey, HBR, PwC, Valtioneuvosto) tuomaan tuoretta kontekstia ja esimerkkejä.
      3. EHDOTA MIEDOSTI: Älä kirjoita käyttäjän puolesta. Käytä muotoja: "Voisiko olla hyödyllistä pohtia...", "Markkinatrendit viittaavat siihen, että...", "Tätä voisi tarkastella myös siitä näkökulmasta, että...".
      4. JOUSTAVUUS: Jos datastore-tieto on vähäistä, rakenna asiantunteva yleisnäkymys ja peilaa sitä löydettyihin tiedonjyviin.

      ERITYISOHJEET KONTEKSTEIHIN:
      - PESTEL: Hyödynnä Valtioneuvoston tulevaisuusselonteon (2024:54) esimerkkejä.
      - KYVYKKYYDET: Muistuta max 6 kyvykkyyden säännöstä ja hyödynnä PwC Strategy& -näkökulmia.
      - LIIKETOIMINTAMALLI: Nojaa Strategyzerin oppeihin arvonluonnista.

      LOPETA JOKAINEN VASTAUS NÄIN:
      ---
      **Ehdotukset jatkoaskeliksi:**
      * [Lisää tähän lyhyt, asiallinen jatkokysymys]
      * [Lisää tähän toinen konkreettinen näkökulma]
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
      text: response.answer?.answerText || "En saanut muodostettua tarkkaa yhteenvetoa. Voisitko täsmentää kysymystäsi, tai kokeilla tunnussanoja kuten 'LTS Liikeidea'?",
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
