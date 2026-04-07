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
    let contextSpecificPreamble = "";
    let useGoogleSearchThreshold = 0.3; // Nostettu 0.1 -> 0.3 vakauden vuoksi

    // --- DYNAAMINEN KONTEKSTIN TUNNISTUS ---
    if (messageUpper.startsWith("STR-")) {
      const section = messageUpper.split('-')[1] || "";
      if (section.includes("YRITYS")) {
        contextSpecificPreamble = "Käytä 'STRATEGIA ohje.pdf' kirkastamaan missiota.";
      } else if (section.includes("TOIMINTAYMPÄRISTÖ")) {
        contextSpecificPreamble = "Hyödynnä Tilastokeskusta, Suomen Pankkia ja Tullia.";
        useGoogleSearchThreshold = 0.1; // Toimintaympäristössä herkempi haku
      } else if (section.includes("LIIKETOIMINTAMALLI")) {
        contextSpecificPreamble = "Käytä Strategyzer-metodeja (Value Proposition & Business Model Canvas).";
      } else {
        contextSpecificPreamble = "Käytä McKinsey, HBR ja Deloitte -lähteitä globaaleihin esimerkkeihin.";
      }
    } 
    else if (messageUpper.startsWith("LTS-")) {
      const section = messageUpper.split('-')[1] || "";
      if (section.includes("PERUSTEET") || section.includes("LIIKEIDEA")) {
        contextSpecificPreamble = "Käytä 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf'. Neuvo yrityksen perustamisessa.";
      } else if (section.includes("LASKELMAT")) {
        contextSpecificPreamble = "Neuvo kassavirta- ja rahoituslaskelmissa tarkasti.";
      }
    }

    // --- PRIORISOITU JA SALLIVA OHJEISTUS ---
    const finalPreamble = `
      Olet Hessonpajan Professional AI -liiketoimintakonsultti. 
      NOUDATA TÄTÄ PRIORITEETTIA:
      1. Etsi vastaus PDF-dokumenteista (LTS/STR ohjeet).
      2. Jos PDF ei sisällä vastausta, hyödynnä asiantuntijalähteitä (McKinsey, HBR, Suomen Pankki, Tulli, Strategyzer).
      3. Jos aihe on yleinen (esim. 'ostajapersoona'), käytä Google-hakua ja vastaa asiantuntevasti.
      
      ÄLÄ sano 'Yhteenvetoa ei voitu luoda', jos aiheesta on yleistä tietoa saatavilla. 
      Vastaa suomeksi, ytimekkäästi (max 4 lausetta) ja käytä bullet pointeja.
      ${contextSpecificPreamble}
    `;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { modelVersion: "preview" },
        promptSpec: { preamble: finalPreamble },
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

    const answerText = response.answer?.answerText || "En löytänyt vastausta. Kokeile kysyä toisella tavalla.";

    res.json({ 
      text: answerText,
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("❌ BACKEND ERROR:", err.message);
    res.status(500).json({ error: "AI-yhteysvirhe" });
  }
});

// --- STATIC FILES & ROUTING ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).send("Not found");
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hessonpaja Intelligence running on port ${PORT}`);
});
