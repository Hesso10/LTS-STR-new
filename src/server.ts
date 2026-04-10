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

    // 1. TUNNISTUS: LTS/STR-TUNNUSSANAT JA MYÖNTÄVÄT VASTAUKSET
    const isLTS = msgLower.startsWith("lts");
    const isSTR = msgLower.startsWith("str");
    
    const searchTriggers = ["joo", "kyllä", "tee se", "sopii", "anna mennä", "ok", "etsi"];
    const isAffirmative = searchTriggers.some(word => msgLower === word || msgLower.startsWith(word + " "));

    let finalQuery = message;
    let currentThreshold = 0.05; // Oletuskynnys

    // 2. LOGIIKKAEROTTELU: TUNNUSSANAT VS. VAPAA PUHE
    if (isLTS) {
      console.log("Suoritetaan LTS-ohjehaku.");
      const querySubject = message.substring(3).trim();
      // Kohdistetaan haku spesifiin tiedostoon
      finalQuery = `Etsi tarkka ohje ja määritelmä tiedostosta 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf' aiheelle: ${querySubject}`;
      currentThreshold = 0.4; // Korkeampi kynnys takaa, että vastaus tulee omasta datasta
    } 
    else if (isSTR) {
      console.log("Suoritetaan STR-ohjehaku.");
      const querySubject = message.substring(3).trim();
      // Kohdistetaan haku spesifiin tiedostoon
      finalQuery = `Etsi tarkka ohje ja määritelmä tiedostosta 'STRATEGIA ohje.pdf' aiheelle: ${querySubject}`;
      currentThreshold = 0.4;
    }
    else if (isAffirmative && lastContextTopic) {
      // Context Lock: Jos käyttäjä sanoo "joo" aiempaan haku-ehdotukseen
      finalQuery = `Analysoi syvällisesti ja etsi tietoa verkosta: ${lastContextTopic}`;
      currentThreshold = 0; // Pakotettu Google Search
    } else {
      // Normaali strateginen kysymys
      const isLawQuery = msgLower.includes("laki") || msgLower.includes("gdpr") || msgLower.includes("tietoturva");
      currentThreshold = isLawQuery ? 0.01 : 0.05;
      if (msgLower.length > 20) lastContextTopic = message;
    }

    // 3. PREAMBLE
    const preamble = `Olet asiantunteva sote-alan strategiakonsultti.
    TEHTÄVÄSI:
    1. Jos viesti alkaa 'LTS', käytä lähteenä 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf'.
    2. Jos viesti alkaa 'STR', käytä lähteenä 'STRATEGIA ohje.pdf'.
    3. Muissa tapauksissa käytä portaalin dataa ja tarvittaessa Google Searchia.
    TYYLI: Ole ytimekäs ja asiantunteva. Mainitse 'Verkkohaun perusteella', jos käytät Googlea.`;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    // 4. KIERROS 1: PORTAALIN DATASTORE
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

    // 5. KIERROS 2: AUTOMAATTINEN FAILOVER (Jos vastaus puuttuu)
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda") || finalAnswer.length < 50) {
      console.log("Kierros 1 ei tuottanut vastausta. Yritetään automaattista laajennettua hakua...");
      
      const [failoverResponse] = await client.answerQuery({
        servingConfig,
        query: { text: finalQuery },
        session: response.session ? { name: response.session.name } : undefined,
        answerGenerationSpec: {
          promptSpec: { preamble: preamble + " PORTAALIDATA EI RIITTÄNYT. ETSI LAAJASTI." },
          includeCitations: true,
          answerLanguageCode: "fi",
        },
        contentSearchSpec: {
          summaryResultCount: 5,
          googleSearchSpec: {
            dynamicRetrievalConfig: { predictor: { threshold: 0 } } // Pakotettu haku
          }
        }
      });

      finalAnswer = failoverResponse.answer?.answerText;
      response = failoverResponse;
    }

    // 6. LOPULLINEN VARMUUS-CHECK
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda")) {
      finalAnswer = `Pahoittelut, en löytänyt ohjetta tiedostoista tai verkosta aiheelle: **${message}**.`;
    }

    res.json({ 
      text: finalAnswer,
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("Vertex AI Error:", err);
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
