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

let lastContextTopic = "";

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();

    // 1. DIAGNOSTIIKKA: Seurataan mitä sisään tulee
    console.log("\n--- UUSI PYYNTÖ ---");
    console.log("Käyttäjän syöte:", message);

    // 2. TUNNISTUS REGEXILLÄ (Varmistaa että 'WEB' poistuu siististi)
    const isWEB = msgLower.startsWith("web");
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");
    
    const searchTriggers = ["joo", "kyllä", "tee se", "sopii", "anna mennä", "ok", "etsi"];
    const isAffirmative = searchTriggers.some(word => msgLower === word || msgLower.startsWith(word + " "));

    let finalQuery = message;
    let currentThreshold = 0.05; 

    // 3. LOGIIKKAEROTTELU
    if (isWEB) {
      // Poistaa 'web' tai 'WEB' ja mahdolliset välilyönnit/erikoismerkit alusta
      finalQuery = message.replace(/^web\s+/i, "").trim();
      currentThreshold = 0; // Pakotettu haku
      console.log("Logiikka: PAKOTETTU WEB-HAKU");
    }
    else if (isLTS) {
      const querySubject = message.replace(/^lts\s+/i, "").trim();
      finalQuery = `Etsi tarkka ohje ja määritelmä tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' aiheelle: ${querySubject}`;
      currentThreshold = 0.4;
      console.log("Logiikka: LTS-TIEDOSTOHAKU");
    } 
    else if (isSTR) {
      const querySubject = message.replace(/^str\s+/i, "").trim();
      finalQuery = `Etsi tarkka ohje ja määritelmä tiedostosta 'STRATEGIA ohje.pdf' aiheelle: ${querySubject}`;
      currentThreshold = 0.4;
      console.log("Logiikka: STR-TIEDOSTOHAKU");
    }
    else if (isAffirmative && lastContextTopic) {
      finalQuery = `Analysoi syvällisesti ja etsi tietoa verkosta: ${lastContextTopic}`;
      currentThreshold = 0; 
      console.log("Logiikka: CONTEXT LOCK AFFIRMATIVE");
    } else {
      const isLawQuery = msgLower.includes("laki") || msgLower.includes("gdpr") || msgLower.includes("tietoturva");
      currentThreshold = isLawQuery ? 0.01 : 0.05;
      if (msgLower.length > 20) lastContextTopic = message;
      console.log("Logiikka: NORMAALI KYSYMYS");
    }

    console.log("Lopullinen hakulauseke (finalQuery):", finalQuery);
    console.log("Käytetty kynnysarvo:", currentThreshold);

    const preamble = `Olet asiantunteva sote-alan strategiakonsultti.
    TEHTÄVÄSI:
    - Jos haku on WEB-pohjainen, käytä Google Searchia ja yhdistele tietoja asiantuntevasti.
    - ÄLÄ sano 'En löytänyt tietoa', vaan käytä yleistietoa ja Google-haun tuloksia parhaan vastauksen luomiseen.
    - Ole ytimekäs. Mainitse 'Verkkohaun perusteella', jos käytät Googlea.`;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    // 4. KIERROS 1: HAKU
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

    // DIAGNOSTIIKKA: Tulostetaan terminaaliin mitä haku oikeasti löysi
    console.log("Vastaus saatu Vertex AI:lta.");
    if (response.answer?.steps) {
        console.log("Hakuaskeleet:", JSON.stringify(response.answer.steps, null, 2));
    }

    let finalAnswer = response.answer?.answerText;

    // 5. FAILOVER (Jos vastaus on tyhjä tai hylätty)
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda") || finalAnswer.length < 20) {
      console.log("FAILOVER: Kierros 1 epäonnistui. Yritetään pakotettua hätähakua...");
      
      const [failoverResponse] = await client.answerQuery({
        servingConfig,
        query: { text: finalQuery },
        answerGenerationSpec: {
          promptSpec: { preamble: preamble + " HUOMIO: Edellinen haku epäonnistui. ETSI NYT GOOGLESTA KAIKKI MAHDOLLINEN." },
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

    // 6. LOPULLINEN TARKISTUS
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda")) {
      console.log("VIRHE: Vastausta ei saatu edes failoverin jälkeen.");
      finalAnswer = `Pahoittelut, en löytänyt ohjetta tiedostoista tai verkosta aiheelle: **${finalQuery}**.`;
    }

    res.json({ 
      text: finalAnswer,
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("KRUUTI VIRHE TERMINAALISSA:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

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
