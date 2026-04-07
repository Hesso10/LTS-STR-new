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

    // --- LOGIIKKA: MOODI A (LTS/STR) VS. MOODI B (KONSULTTI) ---

    if (messageUpper.startsWith("LTS-") || messageUpper.startsWith("STR-")) {
      // MOODI A: TEKNINEN TÄYTTÖAPU
      const file = messageUpper.startsWith("LTS-") ? "LTS LIIKETOIMINTASUUNNITELMA ohje.pdf" : "STRATEGIA ohje.pdf";
      
      finalPreamble = `
        Olet tekninen avustaja. Tehtäväsi on antaa tarkkoja täyttöohjeita PDF-dokumentista '${file}'. 
        SÄÄNNÖT:
        1. Vastaa erittäin ytimekkäästi, enintään 3 lauseella tai lyhyellä listalla.
        2. Pysy tiukasti dokumentin tekstissä ja teknisessä ohjeessa.
        3. Älä käytä omia esimerkkejä tai mainitse ulkopuolisia yrityksiä tässä vaiheessa.
        4. LOPETUS: Lopeta vastaus aina lyhyeen jatkokysymykseen, jossa tarjoat mahdollisuutta syventää aihetta ja oppia, miten kyseinen osa-alue tehdään hyvin ja miten siinä erotutaan kilpailijoista. Älä mainitse yritysten tai konsulttitalojen nimiä jatkokysymyksessä.
      `;
    } else {
      // MOODI B: ASIANTUNTIJATASO (KONSULTTI)
      finalPreamble = `
        Olet kokenut liiketoimintakonsultti. Vastaa asiantuntevasti ja ytimekkäästi (max 5 bulletia).
        SÄÄNNÖT:
        1. Hyödynnä PDF-dokumentteja pohjana, mutta laajenna vastausta teemaan parhaiten sopivilla asiantuntijalähteillä (esim. McKinsey, HBR, Strategyzer, Deloitte, Strategy&).
        2. Käytä Google Searchia aktiivisesti löytääksesi parhaat metodit ja strategiset viisaudet.
        3. LOPETUS: Lopeta vastaus aina lyhyeen jatkokysymykseen, jossa kysyt, haluaako käyttäjä syventää aihetta ja oppia lisää parhaista käytännöistä, strategisesta suunnittelusta ja kilpailuedun rakentamisesta. Älä mainitse yritysten tai konsulttitalojen nimiä jatkokysymyksessä.
      `;
      useGoogleSearchThreshold = 0.15; // Sallivampi haku konsultti-moodissa
    }

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { 
          modelVersion: "preview" 
        },
        promptSpec: { 
          preamble: finalPreamble + " Vastaa suomeksi. Ole ytimekäs."
        },
        includeCitations: true,
        summaryResultCount: 3, // Rajataan tietolähteiden määrää tiiviyden vuoksi
      },
      contentSearchSpec: {
        extractiveContentSpec: { 
          maxNextTokenCount: 500 
        },
        snippetSpec: { 
          maxSnippetCount: 3 
        },
        googleSearchSpec: {
          dynamicRetrievalConfig: {
            predictor: { 
              threshold: useGoogleSearchThreshold 
            }
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
