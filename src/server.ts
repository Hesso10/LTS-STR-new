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

const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 

const client = new ConversationalSearchServiceClient();

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const isTechnical = message.toUpperCase().startsWith("LTS-") || message.toUpperCase().startsWith("STR-");
    
    // UUSI OHJEISTUS (PROMPT): Kappalevälit ja jatkokysymykset
    const preamble = `
      Olet Hessonpajan kokenut liiketoimintakonsultti. 
      Vastaa suomeksi. Käytä vastauksissasi selkeitä kappalevälejä (tuplarivivaihto).
      Käytä lihavointia tärkeimmissä termeissä.
      
      Jos käyttäjä kertoo, mitä otsikkoa hän työstää, personoi vastauksesi siihen.
      
      LOPETA JOKAINEN VASTAUS NÄIN:
      1. Tyhjä rivi.
      2. Otsikko: "---"
      3. Otsikko: "**Ehdotukset jatkokysymyksiksi:**"
      4. Anna 2-3 konkreettista jatkokysymystä, jotka auttavat käyttäjää eteenpäin juuri tässä aiheessa.
    `;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        promptSpec: { preamble },
        includeCitations: true,
      },
      contentSearchSpec: {
        summaryResultCount: 3,
        googleSearchSpec: {
          dynamicRetrievalConfig: { predictor: { threshold: isTechnical ? 0.9 : 0.15 } }
        }
      }
    });

    res.json({ 
      text: response.answer?.answerText || "Vastausta ei löytynyt.",
      sessionId: response.session?.name 
    });
  } catch (err: any) {
    console.error("Vertex AI Error:", err);
    res.status(500).json({ error: "AI Connection Failed" });
  }
});

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (!req.path.startsWith('/api')) res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Hessonpaja running on port ${PORT}`));
