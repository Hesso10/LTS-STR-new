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

    // 2. LOGIIKKA: Pakotetaan tarkennus, jos kysytään vain hyvin yleisesti
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

    // 3. DYNAMIC THRESHOLD: Madalletaan kynnystä tunnussanoilla
    const searchThreshold = (cleanMsg.includes("LTS") || cleanMsg.includes("STR") || cleanMsg.includes("MITEN")) ? 0.01 : 0.15;

    // 4. TIUKENNETTU JA FOKUSOITU PREAMBLE
    const preamble = `
      Olet asiantunteva ja asiallinen suomalainen liiketoimintakonsultti.
      Tehtäväsi on tarjota oivalluksia, jotka auttavat käyttäjää syventämään omaa ajatteluaan.

      KESKEISIN SÄÄNTÖ: 
      - VÄHEMMÄN ON ENEMMÄN. Vastaa tiukasti vain siihen kysymyksen osaan, jota käyttäjä työstää. 
      - Jos käyttäjä kysyy liikeideasta, sparraa VAIN liikeideaa. Älä listaa liiketoimintasuunnitelman vaiheita tai muita osa-alueita.
      - Syvennä vastausta laadulla, älä pituudella.

      TYYLI JA ASENNE:
      - Analyyttinen, rauhallinen ja suora suomalainen ammattilaistyyli.
      - Käytä termejä kuten "merkittävä", "huomioitava" tai "kannattanee pohtia".
      - ÄLÄ käytä termejä "Hessonpaja" tai "kokenut".
      - Vastaa AINA suomeksi. Käytä TUPLARIVIVAIHTOA kappaleiden välillä.

      SPARRAUSLOGIIKKA:
      1. ANALYSOI: Etsi vastaus ensisijaisesti portaalin ohjeista (Data Store).
      2. RIKASTA: Käytä Google Searchia tuomaan tuoretta markkinatietoa ja asiantuntijanäkemyksiä.
      3. EHDOTA MIEDOSTI: Käytä muotoja: "Voisiko olla hyödyllistä pohtia...", "Markkinatrendit viittaavat siihen, että...".

      LOPETA JOKAINEN VASTAUS NÄIN:
      ---
      **Ehdotukset jatkoaskeliksi:**
      * [Lyhyt, asiallinen jatkokysymys juuri tästä aiheesta]
      * [Konkreettinen näkökulma, joka syventää tätä nimenomaista kohtaa]
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

    res.json({ 
      text: response.answer?.answerText || "En saanut muodostettua tarkkaa yhteenvetoa. Voisitko täsmentää kysymystäsi käyttämällä tunnussanoja kuten 'LTS liikeidea'?",
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("Vertex AI Error:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

// Staattisten tiedostojen tarjoilu
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
