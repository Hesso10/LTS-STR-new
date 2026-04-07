import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { GoogleAuth } from 'google-auth-library';
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const PROJECT_ID = "16978149266"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775467703431"; 

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const client = new ConversationalSearchServiceClient({
  apiEndpoint: "discoveryengine.googleapis.com",
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.get("/api/vertex-token", async (_req, res) => {
  try {
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    res.json({ token: tokenResponse.token, project: PROJECT_ID });
  } catch (error: any) {
    console.error("Token Error:", error.message);
    res.status(500).json({ error: "Auth failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const sessionId = req.body?.sessionId; 

    if (!message) return res.status(400).json({ error: "Missing message" });

    const messageUpper = message.toUpperCase();
    let finalPreamble = "";
    let useGoogleSearchThreshold = 0.3;

    // --- LOGIIKKA: TUNNUSANAT (LTS/STR) VS. VAPAA CHAT ---

    if (messageUpper.startsWith("LTS-") || messageUpper.startsWith("STR-")) {
      // MOODI A: ININSINÖÖRIMÄINEN TÄYTTÖAPU
      const portal = messageUpper.startsWith("LTS-") ? "Liiketoimintasuunnitelma" : "Strategia";
      const file = messageUpper.startsWith("LTS-") ? "LTS LIIKETOIMINTASUUNNITELMA ohje.pdf" : "STRATEGIA ohje.pdf";
      
      finalPreamble = `
        Olet tekninen avustaja ${portal}-portaalissa. 
        TEHTÄVÄ: Anna tekninen ja insinöörimäinen täyttöohje PDF-tiedostosta '${file}'.
        SÄÄNNÖT: 
        1. Pysy tiukasti kyseisen lomakekohdan teknisessä ohjeessa.
        2. Älä jaarittele tai käytä yleisiä esimerkkejä, elleivät ne ole PDF:ssä.
        3. Ole lyhyt, suora ja muodollinen.
      `;
    } else {
      // MOODI B: KONSULTTI & MAAILMANLUOKAN ESIMERKIT
      finalPreamble = `
        Olet Hessonpajan kokenut liiketoimintakonsultti.
        TEHTÄVÄ: Auta käyttäjää ymmärtämään liiketoiminnan ja strategian käsitteitä.
        SÄÄNNÖT:
        1. Käytä pohjana Hessonpajan PDF-dokumentteja, mutta JYKEVÖITÄ vastausta maailmanluokan esimerkeillä (kuten Apple, IKEA, Tesla, Southwest Airlines).
        2. Hyödynnä aktiivisesti Google-hakua ja asiantuntijalähteitä (McKinsey, HBR, Strategyzer, Deloitte).
        3. Älä sano 'Yhteenvetoa ei voitu luoda'. Jos PDF ei vastaa, vastaa nettilähteiden ja yleisen strategisen viisauden perusteella.
        4. Vastaa inspiroivasti, asiantuntevasti ja ytimekkäästi (max 5 bulletia).
      `;
      useGoogleSearchThreshold = 0.15; // Sallivampi haku "konsultti-moodissa"
    }

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { modelVersion: "preview" },
        promptSpec: { 
          preamble: finalPreamble + " Vastaa suomeksi."
        },
        includeCitations: true,
      },
      contentSearchSpec: {
        extractiveContentSpec: { maxNextTokenCount: 500 },
        snippetSpec: { maxSnippetCount: 5 },
        googleSearchSpec: {
          dynamicRetrievalConfig: {
            predictor: { threshold: useGoogleSearchThreshold }
          }
        }
      }
    });

    const answerText = response.answer?.answerText || "En löytänyt vastausta. Kokeile kysyä eri tavalla.";

    res.json({ 
      text: answerText,
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("❌ BACKEND ERROR:", err.message);
    res.status(500).json({ error: "AI-yhteysvirhe" });
  }
});

// --- STATIC FILES ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).send("Not found");
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hessonpaja Intelligence (Dual-Mode) running on port ${PORT}`);
});
