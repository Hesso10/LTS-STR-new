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

    // Tunnistetaan tunnussanat LTS ja STR
    const isTechnical = message.toUpperCase().includes("LTS") || message.toUpperCase().includes("STR");
    const searchThreshold = isTechnical ? 0.05 : 0.15;

    // OHJEISTUS (PREAMBLE): Hyödyntää PDF-dokumenttien sisältöä
    const preamble = `
      Olet Hessonpajan kokenut liiketoimintakonsultti. Käytössäsi on kaksi pääohjetta: "LTS LIIKETOIMINTASUUNNITELMA ohje" ja "STRATEGIA ohje".

      TOIMINTAOHJEET:
      1. TUNNISTA KONTEKSTI: 
         - Jos viestissä on "LTS", käytä ensisijaisena lähteenä LTS LIIKETOIMINTASUUNNITELMA ohjetta.
         - Jos viestissä on "STR", käytä ensisijaisena lähteenä STRATEGIA ohjetta.
      
      2. OTSIKKOHAKU: 
         - Käyttäjä antaa tunnussanan jälkeen kentän nimen (esim. "LTS Liikeidea" tai "STR Arvolupaus").
         - Etsi dokumentista kyseistä otsikkoa vastaava kohta (esim. Liikeidea tai Arvolupaus) ja tarjoa lyhyt ohje.
      
      3. VASTAUKSEN MUOTOILU:
         - Vastaa aina suomeksi.
         - Käytä TUPLARIVIVAIHTOA tekstikappaleiden välissä.
         - Jos ohjeessa on apukysymyksiä (esim. Mitä? Miten? Kenelle?), listaa ne selkeästi.

      LOPETA JOKAINEN VASTAUS NÄIN:
      ---
      **Ehdotukset jatkokysymyksiksi:**
      * [Aiheeseen liittyvä kysymys]
      * [Toinen kysymys]
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

    res.json({ 
      text: response.answer?.answerText || "Pahoittelut, en löytänyt ohjetta. Kokeile esim: 'LTS Liikeidea'.",
      sessionId: response.session?.name 
    });
  } catch (err: any) {
    console.error("Vertex AI Error:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

// Staattiset tiedostot
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, "index.html"));
  }
});

// TÄRKEÄÄ CLOUD RUNILLE: Kuunnellaan porttia 0.0.0.0 osoitteessa
const PORT = process.env.PORT || 8080;
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Palvelin käynnissä portissa ${PORT}`);
});
