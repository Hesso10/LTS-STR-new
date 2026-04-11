// src/server.ts
import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 

const client = new ConversationalSearchServiceClient();

// Globaali muuttuja context-lockia varten
let lastContextTopic = "";

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();

    // 1. DIAGNOSTIIKKA LOKI
    console.log("\n--- UUSI PYYNTÖ ---");
    console.log("Käyttäjän syöte:", message);

    // 2. TUNNISTUS: WEB, LTS, STR JA MYÖNTÄVÄT VASTAUKSET
    const isWEB = msgLower.startsWith("web");
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");
    
    const searchTriggers = ["joo", "kyllä", "tee se", "sopii", "anna mennä", "ok", "etsi"];
    const isAffirmative = searchTriggers.some(word => msgLower === word || msgLower.startsWith(word + " "));

    let finalQuery = message;
    let currentThreshold = 0.05; // Oletuskynnys

    // 3. LOGIIKKAEROTTELU (Ankkuroitu PDF-dokumentteihin)
    if (isWEB) {
      // Pakotettu Google-haku: Poistetaan 'web' ja puhdistetaan kysely
      finalQuery = message.replace(/^web\s+/i, "").trim();
      currentThreshold = 0; 
      console.log("Logiikka: PAKOTETTU WEB-HAKU. Hakusana:", finalQuery);
    }
    else if (isLTS) {
      console.log("Logiikka: LTS-TÄSMÄHAKU");
      const userTerm = message.replace(/^lts\s+/i, "").toLowerCase().trim();
      const LTS_STRUCTURE: { [key: string]: string } = {
        "yritysmuoto": "Yritysmuoto (sivu 1): Valinta, suositukset ja yleisimmät muodot. [cite: 14, 15, 17]",
        "tausta": "Tausta (sivu 2): Osaaminen, kokemus, vahvuudet ja kehittämiskohteet. [cite: 20, 22, 23, 25, 26]",
        "liikeidea": "Liikeidea (sivu 2): Mitä, miten, kenelle ja liikeidean merkitys. [cite: 30, 32, 33, 34, 35]",
        "toimintaympäristö": "Ulkoisen toimintaympäristön analyysi (sivut 3-4): PESTEL-osa-alueet. [cite: 53, 54, 57, 62, 73, 79, 85]",
        "kilpailutilanne": "Kilpailutilanne (sivu 4): Markkina-alue ja kilpailijoiden määrittely. [cite: 88, 89, 90]",
        "asiakkaat": "Asiakkaat (sivu 5): Markkinakoko, ostovoima ja profiilit. [cite: 91, 92, 98]",
        "sisäinen ympäristö": "Sisäinen toimintaympäristö (sivu 5): Kokonaistehokkuus ja analyysin hyödyt. [cite: 99, 107, 116]",
        "strategia": "Strategia (sivu 6): Visio, arvot ja diagnoosi. [cite: 119, 122, 125, 126]",
        "miten": "Miten-osio (sivu 6): Kyvykkyydet (max 6 kpl) ja reagointi diagnoosiin. [cite: 129, 131, 132]",
        "markkinointi": "Myynti & markkinointi (sivu 7): Kohderyhmät, ostajapersoonat ja toimenpiteet. [cite: 138, 139, 144, 146]",
        "laskelmat": "Laskelmat (sivu 7): Vuosibudjetti ja myyntitavoitteet. [cite: 151, 154, 155]",
        "henkilöstö": "Henkilöstö (sivu 7): Resurssit ja osaamisen ostaminen. [cite: 157, 158, 159]",
        "toteutus": "Toteutus (sivu 8): Strategian jalkautus ja aikataulutus. [cite: 161, 162]"
      };
      const anchor = LTS_STRUCTURE[userTerm] || userTerm;
      finalQuery = `Etsi tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' tarkka ohje: ${anchor}`;
      currentThreshold = 0.4;
    } 
    else if (isSTR) {
      console.log("Logiikka: STR-TÄSMÄHAKU");
      const userTerm = message.replace(/^str\s+/i, "").toLowerCase().trim();
      const STR_STRUCTURE: { [key: string]: string } = {
        "yritykseni": "Yritykseni (sivu 1): Historia, nykytila ja päätuotteet. [cite: 164, 165, 166]",
        "organisaatio": "Organisaatiorakenne (sivu 1): Rakenteen muotoilu. [cite: 169]",
        "toimintaympäristö": "Toimintaympäristö (sivut 1-3): Ulkoinen analyysi, PESTEL ja diagnoosi. [cite: 170, 185, 186, 189, 194, 205, 214, 220]",
        "kilpailutilanne": "Kilpailutilanne (sivu 3): Kilpailijaprofiilit ja markkina-alue. [cite: 223, 224, 226]",
        "asiakkaat": "Asiakkaat (sivu 3): Markkinakoko ja kohderyhmät. [cite: 227, 228, 235]",
        "sisäinen ympäristö": "Sisäinen toimintaympäristö (sivu 4): Plussat, miinukset ja tehokkuus. [cite: 236, 238, 243, 252]",
        "strategia": "Strategia (sivu 5): Visio, arvot ja reagointiresepti. [cite: 257, 260, 263, 264]",
        "miten": "Miten-osio (sivu 5): Kyvykkyydet ja reagointi diagnoosiin. [cite: 267, 269, 270]",
        "liiketoimintamalli": "Liiketoimintamalli (sivu 5): Taktiikka, aktiviteetit ja resurssit. [cite: 275, 276, 277]",
        "arvolupaus": "Arvolupaus (sivu 6): Asiakashyöty ja tuotevalikoima. [cite: 282, 283]",
        "kanavat": "Kanavat (sivu 6): Asiakaspolku, markkinointi ja myynti. [cite: 284, 285, 287]",
        "resurssit": "Tärkeimmät resurssit (sivu 6): Aineelliset ja aineettomat resurssit. [cite: 292, 293, 296]",
        "aktiviteetit": "Tärkeimmät aktiviteetit (sivu 7): Toimenpiteet, joilla resurssit heräävät. [cite: 300, 301, 304]",
        "tulot": "Tulot (sivu 7): Rahavirran logiikka ja ansaintamallit. [cite: 309, 310, 312]",
        "kustannukset": "Kustannukset (sivu 7): Korvamerkityt varat ja strategiset hankkeet. [cite: 313, 314, 315]",
        "projekti": "Projektini (sivu 8): Strategian vieminen työnkuvaan. [cite: 319, 320]"
      };
      const anchor = STR_STRUCTURE[userTerm] || userTerm;
      finalQuery = `Etsi tiedostosta 'STRATEGIA ohje.pdf' tarkka ohje: ${anchor}`;
      currentThreshold = 0.4;
    }
    else if (isAffirmative && lastContextTopic) {
      finalQuery = `Analysoi syvällisesti ja etsi tietoa verkosta: ${lastContextTopic}`;
      currentThreshold = 0; 
      console.log("Logiikka: CONTEXT LOCK - Jatketaan hakuun.");
    } else {
      // Normaali kysymys: Tunnistetaan sote-alan herkkä sisältö
      const isLawQuery = msgLower.includes("laki") || msgLower.includes("gdpr") || msgLower.includes("tietoturva");
      currentThreshold = isLawQuery ? 0.01 : 0.05;
      if (msgLower.length > 20) lastContextTopic = message;
      console.log("Logiikka: NORMAALI KYSYMYS. Kynnys:", currentThreshold);
    }

    // 4. PREAMBLE
    const preamble = `Olet asiantunteva sote-alan strategiakonsultti.
    TEHTÄVÄSI:
    1. Jos haku on WEB-pohjainen, käytä Google Searchia laajasti. ÄLÄ sano 'en löytänyt tietoa'.
    2. Jos käytät tiedostoja (LTS/STR), vastaa tarkasti ohjeen mukaisesti.
    3. Ole ytimekäs ja asiantunteva. Mainitse 'Verkkohaun perusteella', jos käytät Googlea.`;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    // 5. KIERROS 1: HAKU
    let [response] = await client.answerQuery({
      servingConfig,
      query: { text: finalQuery },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        promptSpec: { preamble },
        includeCitations: true,
        answerLanguageCode: "fi",
      },
      contentSearchSpec: {
        summaryResultCount: 5,
        googleSearchSpec: {
          dynamicRetrievalConfig: { predictor: { threshold: currentThreshold } } 
        }
      }
    });

    let finalAnswer = response.answer?.answerText;
    console.log("Vastaus saatu Vertex AI:lta.");

    // 6. FAILOVER (Jos vastaus puuttuu tai haku hylättiin)
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda") || finalAnswer.length < 20) {
      console.log("FAILOVER: Yritetään pakotettua Google-hakua...");
      
      const [failoverResponse] = await client.answerQuery({
        servingConfig,
        query: { text: finalQuery },
        answerGenerationSpec: {
          promptSpec: { preamble: preamble + " PORTAALIDATA EI RIITTÄNYT. ETSI LAAJASTI NETISTÄ." },
          includeCitations: true,
          answerLanguageCode: "fi",
        },
        contentSearchSpec: {
          googleSearchSpec: {
            dynamicRetrievalConfig: { predictor: { threshold: 0 } }
          }
        }
      });

      finalAnswer = failoverResponse.answer?.answerText;
      response = failoverResponse;
    }

    // 7. LOPULLINEN VARMUUS-CHECK
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda")) {
      finalAnswer = `Pahoittelut, en löytänyt ohjetta tiedostoista tai verkosta aiheelle: **${message}**.`;
    }

    res.json({ 
      text: finalAnswer,
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("KRUUTI VIRHE:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

// Staattiset tiedostot
const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(200).send("Server Active");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
