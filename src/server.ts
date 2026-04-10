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

// Tallennetaan viimeisin aihe muistiin väliaikaisesti (tämä nollautuu palvelimen käynnistyksessä)
// Cloud Runissa tämä on sessio-kohtaista vain jos sessiohallinta on päällä
let lastContextTopic = "";

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();

    // 1. TUNNISTUS: Onko kyseessä hakupyyntö vai kohteliaisuus?
    const positiveWords = ["kiitos", "kiitokset", "kiitti", "loistavaa", "hienoa"];
    const searchTriggers = ["tee", "etsi", "haku", "kyllä", "joo", "anna mennä", "toteuta"];
    
    const isPositive = positiveWords.some(word => msgLower.startsWith(word));
    const isAskingForSearch = searchTriggers.some(word => msgLower.includes(word));

    // SOSIAALINEN PELISILMÄ (Priorisoidaan haku, jos molemmat läsnä)
    if (isPositive && msgLower.length < 30 && !isAskingForSearch) {
      return res.json({
        text: "Kiitos palautteesta! Mukava olla avuksi. Mistä kohdasta strategiatyötä haluaisit jatkaa?",
        sessionId: sessionId 
      });
    }

    // 2. CONTEXT LOCK - LOGIIKKA
    // Jos viesti on hyvin lyhyt "kyllä" tms, käytetään aiempaa aihetta hakukyselynä
    let finalQuery = message;
    if (isAskingForSearch && msgLower.length < 15 && lastContextTopic) {
      finalQuery = `Etsi verkosta tietoa aiemmin mainitusta aiheesta: ${lastContextTopic}`;
      console.log(`Context Lock aktivoitu: ${finalQuery}`);
    } else {
      // Päivitetään viimeisin aihe muistiin (jos viesti on riittävän pitkä ollakseen asiasisältöä)
      if (msgLower.length > 20) {
        lastContextTopic = message;
      }
    }

    // 3. HAKUKYNNYS
    const isLawQuery = msgLower.includes("laki") || msgLower.includes("valmistelu") || msgLower.includes("finlex") || msgLower.includes("tietoturva");
    const searchThreshold = (isAskingForSearch || isLawQuery) ? 0.001 : 0.05;

    // 4. PREAMBLE
    const preamble = `
      Olet asiantunteva suomalainen konsultti. Tyylisi on analyyttinen ja asiallinen.

      TOIMINTATAPA:
      1. Jos portaalin data ei vastaa kysymykseen, sano se suoraan: "Portaalin ohjeista ei löytynyt suoraa vastausta tähän..."
      2. Tämän jälkeen käytä Google Searchia hakeaksesi tietoa luotettavista lähteistä (Finlex, Hankeikkuna, viranomaiset).
      3. Jos vastaus on Googlesta, mainitse se selkeästi.
      4. ÄLÄ KOSKAAN vastaa "Yhteenvetoa ei voitu luoda".
    `;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: finalQuery }, // Käytetään mahdollista Context Lockilla korjattua kyselyä
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        promptSpec: { preamble },
        includeCitations: true,
        answerLanguageCode: "fi",
      },
      contentSearchSpec: {
        summaryResultCount: 5,
        googleSearchSpec: {
          dynamicRetrievalConfig: { predictor: { threshold: searchThreshold } } 
        }
      }
    });

    let finalAnswer = response.answer?.answerText;

    // 5. CATCH-ALL VIRHEISIIN
    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda")) {
      finalAnswer = "Portaalin sisäisistä lähteistä ei löytynyt suoraa vastausta aiheeseen: **" + (lastContextTopic || "tämä aihe") + "**. Haluaisitko, että teen laajemman haun verkosta?";
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

// STAATTISET TIEDOSTOT
const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send("Palvelin on käynnissä (Käyttöliittymää ladataan).");
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
