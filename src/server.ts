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
    const positiveWords = ["kiitos", "kiitokset", "kiitti", "loistavaa", "hienoa", "hyvä", "mahtavaa"];
    const frustrationWords = ["ei toimi", "huono", "en ymmärrä", "vaikeaa", "sekava", "ärsyttävä"];

    const isPositive = positiveWords.some(word => msgLower.startsWith(word));
    const isFrustrated = frustrationWords.some(word => msgLower.includes(word));

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

    // 2. DYNAAMINEN HAKUKYNNYS (Threshold)
    // Lasketaan kynnys erittäin alas (0.001) lainsäädäntöön liittyvissä kysymyksissä, jotta Google Search aktivoituu varmasti.
    const isLawQuery = msgLower.includes("laki") || msgLower.includes("valmistelu") || msgLower.includes("säädös") || msgLower.includes("finlex");
    const isDefinition = msgLower.includes("mikä") || msgLower.includes("mitä") || msgLower.length < 30;
    
    const searchThreshold = (msgLower.includes("lts") || msgLower.includes("str") || isDefinition || isLawQuery) ? 0.001 : 0.05;

    // 3. TIUKKA JA ITSENÄINEN HAKUSTRATEGIA (PREAMBLE)
    const preamble = `
      Olet asiantunteva suomalainen liiketoimintakonsultti ja strateginen sparraaja. Tyylisi on analyyttinen, rauhallinen ja asiallinen.

      HAKUSTRATEGIA (KRIITTINEN):
      1. Ensisijainen lähde: Data Store (Portaalin ohjeet).
      2. Toissijainen lähde: Google Search.
      3. JOS Data Store ei sisällä tietoa (esim. lainvalmistelu, säädökset, tuoreet uutiset, yleiset käsitteet), käytä Google Searchia ITSENÄISESTI.
      4. ÄLÄ KOSKAAN vastaa "Yhteenvetoa ei voitu luoda". Jos et löydä suoraa vastausta tiedostoista, toimi asiantuntijana ja ohjaa käyttäjä oikean tiedon äärelle hyödyntäen Google Searchia
