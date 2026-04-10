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

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const msgLower = message.toLowerCase().trim();

    // --- 1. SOSIAALINEN JA EMOTIONAALINEN PELISILMÄ ---
    const frustrationWords = ["huono", "en ymmärrä", "vaikeaa", "sekava", "ärsyttävä", "turhauttavaa", "paska", "ei auta"];
    const positiveWords = ["kiitos", "kiitokset", "kiitti", "loistavaa", "hienoa", "hyvä"];

    // PRIORITEETTI 1: Turhaumat (Aina päällä)
    if (frustrationWords.some(word => msgLower.includes(word)) && msgLower.length < 120) {
      return res.json({
        text: "Pahoittelut, että vastaus ei ollut riittävän selkeä tai kattava. Strategiatyö ja lainsäädäntö voivat olla monimutkaisia kokonaisuuksia.\n\nHaluaisitko, että yritän etsiä tietoa laajemmin portaalin ulkopuolelta (esim. Finlex/Hankeikkuna) vai keskitytäänkö johonkin tiettyyn termiin?",
        sessionId: sessionId 
      });
    }

    // PRIORITEETTI 2: Kiitokset
    if (positiveWords.some(word => msgLower.startsWith(word)) && msgLower.length < 40) {
      return res.json({
        text: "Kiitos palautteesta, mukava olla avuksi! Jatketaanpa työstämistä – mistä kohdasta haluaisit jatkaa?",
        sessionId: sessionId 
      });
    }

    // --- 2. HAKUKYNNYKSEN SÄÄTÖ ---
    // Jos käyttäjä vastaa myöntävästi hakuun tai kysyy laista
    const isAskingForSearch = msgLower.includes("etsi") || msgLower.includes("netti") || msgLower.includes("haku") || msgLower === "kyllä" || msgLower === "joo";
    const isLawQuery = msgLower.includes("laki") || msgLower.includes("valmistelu") || msgLower.includes("säädös") || msgLower.includes("finlex");
    
    // Erittäin matala kynnys, jos käyttäjä nimenomaan pyytää hakua
    const searchThreshold = (isAskingForSearch || isLawQuery) ? 0.001 : 0.05;

    // --- 3. PREAMBLE (Asiantuntijan persoona) ---
    const preamble = `
      Olet asiantunteva suomalainen liiketoimintakonsultti. Tyylisi on analyyttinen ja asiallinen.

      TOIMINTATAPA DATAN PUUTTUESSA:
      1. Jos portaalin data (Data Store) ei vastaa kysymykseen, sano se suoraan: "Portaalin ohjeista ei löytynyt suoraa vastausta tähän..."
      2. Tämän jälkeen käytä Google Searchia hakeaksesi tietoa luotettavista lähteistä (Finlex, Hankeikkuna, McKinsey jne.).
      3. ÄLÄ KOSKAAN vastaa "Yhteenvetoa ei voitu luoda". Jos olet epävarma, tarjoa asiantuntijanäkökulma ja ehdota lisähakua.

      TYYLI:
      - Vastaa VAIN siihen mitä kysytään.
      - Käytä suomea ja asiallista kieltä.
      - Lihavoi strategiset avainsanat.
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
          dynamicRetrievalConfig: { predictor: { threshold: searchThreshold } } 
        }
      }
    });

    // --- 4. VIRHEENKÄSITTELY (Catch-all virheilmoituksille) ---
    let finalAnswer = response.answer?.answerText;

    if (!finalAnswer || finalAnswer.includes("Yhteenvetoa ei voitu luoda") || finalAnswer.includes("Summary could not be generated")) {
      finalAnswer = "Portaalin sisäisistä lähteistä ei löytynyt suoraa vastausta tähän. Haluaisitko, että teen laajemman haun verkosta (esim. Finlex tai asiantuntijalähteet)?";
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
