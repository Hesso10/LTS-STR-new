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
    let dynamicPreamble = "";
    let useGoogleSearchThreshold = 0.3; // Oletus: maltillinen haku

    // --- DYNAAMINEN KONTEKSTIN TUNNISTUS ---

    if (messageUpper.startsWith("STR-")) {
      // STRATEGIA-PORTAALI
      const section = messageUpper.split('-')[1] || "";
      
      if (section.includes("YRITYS")) {
        dynamicPreamble = "Olet asiantuntija yrityksen identiteetin määrittelyssä. Käytä 'STRATEGIA ohje.pdf'. Auta kirkastamaan missio ja visio.";
      } else if (section.includes("TOIMINTAYMPÄRISTÖ")) {
        dynamicPreamble = "Olet markkina-analyytikko. Hyödynnä Tilastokeskusta, Suomen Pankkia ja Tullia. Analysoi megatrendejä.";
        useGoogleSearchThreshold = 0.1; // Tarvitaan tuoretta tietoa
      } else if (section.includes("LIIKETOIMINTAMALLI")) {
        dynamicPreamble = "Olet Business Designer. Käytä Strategyzer-metodeja (Value Proposition & Business Model Canvas). Painota arvolupausta.";
      } else {
        dynamicPreamble = "Olet strategia-asiantuntija. Käytä McKinsey, HBR ja Deloitte -lähteitä globaaleihin esimerkkeihin. Lähde: 'STRATEGIA ohje.pdf'.";
      }
    } 
    else if (messageUpper.startsWith("LTS-")) {
      // LIIKETOIMINTASUUNNITELMA-PORTAALI
      const section = messageUpper.split('-')[1] || "";

      if (section.includes("PERUSTEET") || section.includes("LIIKEIDEA")) {
        dynamicPreamble = "Olet yritysneuvoja. Käytä 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf'. Neuvo käytännönläheisesti yrityksen perustamisessa.";
      } else if (section.includes("TOIMINTAYMPÄRISTÖ")) {
        dynamicPreamble = "Olet markkinatutkija. Käytä Stat.fi ja Tullin vientitilastoja. Peilaa tietoa PDF-ohjeen rakenteeseen.";
        useGoogleSearchThreshold = 0.1;
      } else if (section.includes("LASKELMAT")) {
        dynamicPreamble = "Olet talousasiantuntija. Neuvo kassavirta- ja rahoituslaskelmissa erittäin tarkasti ja analyyttisesti.";
      } else {
        dynamicPreamble = "Olet Hessonpajan LTS-asiantuntija. Käytä ensisijaisesti 'LTS LIIKETOIMINTASUUNNITELMA ohje.pdf'.";
      }
    } 
    else {
      // YLEINEN CHAT
      dynamicPreamble = "Olet Hessonpaja-avustaja, liiketoiminnan suunnittelun asiantuntija. Vastaa ytimekkäästi ja auttavasti.";
    }

    // Lopullinen ohjeistus (Preamble)
    const finalPreamble = `${dynamicPreamble} Vastaa suomeksi. Ole erittäin ytimekäs (max 3-5 lausetta). Käytä bullet pointeja. Jos käytät verkkolähteitä, mainitse ne vastauksen lopussa.`;

    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;

    console.log(`--- 🚀 Route: ${messageUpper.split(' ')[0]} | Grounding: ${useGoogleSearchThreshold} ---`);

    const [response] = await client.answerQuery({
      servingConfig,
      query: { text: message },
      session: sessionId ? { name: sessionId } : undefined,
      answerGenerationSpec: {
        modelSpec: { 
          modelVersion: "preview" 
        },
        promptSpec: {
          preamble: finalPreamble,
        },
        includeCitations: true,
      },
      contentSearchSpec: {
        extractiveContentSpec: { 
          maxNextTokenCount: 500 // Tiivistetty vastauspituus
        },
        snippetSpec: {
          maxSnippetCount: 3 // Vain oleellisimmat palaset
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

    const answerText = response.answer?.answerText || "En löytänyt vastausta lähteistäni.";

    res.json({ 
      text: answerText,
      sessionId: response.session?.name 
    });

  } catch (err: any) {
    console.error("❌ BACKEND ERROR:", err.message);
    res.status(500).json({ 
      error: "AI-yhteysvirhe", 
      details: err.message 
    });
  }
});

const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).send("Not found");
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hessonpaja Master Intelligence running on port ${PORT}`);
});
