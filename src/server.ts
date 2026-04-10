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

// Google Cloud Konfiguraatio
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 

const client = new ConversationalSearchServiceClient();

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    // Muunnetaan viesti vertailua varten
    const msgLower = message.toLowerCase().trim();

    // 1. SOSIAALINEN JA EMOTIONAALINEN SUODATIN
    // Tunnistetaan kiitokset, tervehdykset ja turhaumat ilman raskasta hakua.

    const positiveWords = ["kiitos", "kiitokset", "kiitti", "loistavaa", "hienoa", "hyvä", "mahtavaa"];
    const frustrationWords = ["ei toimi", "huono", "en ymmärrä", "vaikeaa", "sekava", "ärsyttävä"];

    const isPositive = positiveWords.some(word => msgLower.startsWith(word));
    const isFrustrated = frustrationWords.some(word => msgLower.includes(word));

    // Jos kyseessä on vain lyhyt palaute ilman strategiasanoja (LTS/STR)
    if (!msgLower.includes("lts") && !msgLower.includes("str")) {
      
      if (isPositive && msgLower.length < 40) {
        return res.json({
          text: "Kiitos palautteesta, mukava olla avuksi. Jatketaanpa työstämistä – mistä kohdasta haluaisit jatkaa?",
          sessionId: sessionId 
        });
      }

      if (isFrustrated && msgLower.length < 50) {
        return res.json({
          text: "Pahoittelut, jos vastaus oli epäselvä. Strategiatyö voi olla monimutkaista. Yritänkö selittää asian toisella tavalla vai keskitytäänkö johonkin tiettyyn termiin?",
          sessionId: sessionId 
        });
      }
    }

    // 2. AGGRESSIIVINEN HAKUKYNNYS (Google Search fallback)
    const isDefinition = msgLower.includes("mikä") || msgLower.includes("mitä") || msgLower.length < 30;
    const searchThreshold = (msgLower.includes("lts") || msgLower.includes("str") || isDefinition) ? 0.005 : 0.05;

    // 3. TIUKKA HAKUSTRATEGIA (PREAMBLE)
    const preamble = `
      Olet asiantunteva suomalainen liiketoimintakonsultti. Tyylisi on analyyttinen, rauhallinen ja asiallinen.

      SOSIAALINEN SÄVY:
      - Ole kohtelias mutta pidättyväinen. Vältä ylisanoja.
      - Validoi käyttäjän kysymys asiantuntijanäkökulmasta.

      HAKUSTRATEGIA:
      1. JOS vastaus ei löydy Data Storesta, suuntaa haku välittömästi Googleen.
      2. ÄLÄ KOSKAAN vastaa "Yhteenvetoa ei voitu luoda". Jos data on vähissä, käytä asiantuntemustasi selittämään asia yleisellä tasolla ja silloita se strategiseen kontekstiin.
      
      TOIMINTATAPA:
      - Vastaa VAIN siihen mitä kysytään.
      - Jos kyse on kyvykkyyksistä, jäsennä se prosessien, ihmisten ja teknologian kautta.
      - Käytä suomea, asiallista kieltä ja tuplarivivaihtoa kappaleiden välillä.

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

    res.json({ 
      text: response.answer?.answerText || "Portaalin ohjeista ei löytynyt suoraa vastausta, mutta strategisesta näkökulmasta tätä kannattaa pohtia näin...",
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

// Portin luku
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
}); 
