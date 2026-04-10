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
    let { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const cleanMsg = message.toUpperCase().trim();

    // 1. SOSIAALINEN SUODATIN (Small Talk -käsittely)
    // Estetään haku-virheet, kun käyttäjä on vain kohtelias tai tervehtii.
    const socialKeywords = ["KIITOS", "KIITOKSIA", "MOI", "HEI", "TERVE", "HYVÄ VASTAUS", "LOISTAVAA", "KIITTI"];
    const isPureSocial = socialKeywords.some(word => cleanMsg === word || cleanMsg === word + "!") || 
                         (cleanMsg.length < 25 && socialKeywords.some(word => cleanMsg.includes(word)));

    if (isPureSocial && !cleanMsg.includes("LTS") && !cleanMsg.includes("STR")) {
      return res.json({
        text: "Kiitos, mukava kuulla, että vastauksesta oli apua strategiatyössäsi. \n\nMistä osa-alueesta haluaisit jatkaa keskustelua tai onko jokin tietty kohta, jota haluaisit syventää tarkemmin?",
        sessionId: sessionId 
      });
    }

    // 2. META-LOGIIKKA: Ohjeistus lennosta
    if (cleanMsg.startsWith("OHJE:") || cleanMsg.includes("TOIMI JATKOSSA")) {
      message = `[KÄYTTÄJÄN OHJEISTUS: ${message}]. Huomioi tämä tyylissäsi ja vahvista ymmärryksesi.`;
    }

    // 3. STRATEGIA-VALIKKO (Yleisimmät tyhjät haut)
    const isGenericSTR = cleanMsg === "STR" || cleanMsg === "STR STRATEGIA" || cleanMsg === "STRATEGIA";
    if (isGenericSTR) {
      return res.json({
        text: "Strategia-osio on laaja kokonaisuus. Haluaisitko lähteä liikkeelle jostakin näistä?\n\n" +
              "* **Visio**: Aikaan sidottu päätavoite.\n" +
              "* **Arvot**: Toiminnan eettinen perusta.\n" +
              "* **Diagnoosi**: Nykytilan ja ympäristön analyysi.\n" +
              "* **Miten (Kyvykkyydet)**: Toimenpiteet diagnoosiin vastaamiseksi.\n\n" +
              "Kerro minulle, mitä näistä työstät, niin pohditaan sitä tarkemmin.",
        sessionId: sessionId 
      });
    }

    // 4. AGGRESSIIVINEN HAKUKYNNYS (Google Search fallback)
    // Käytetään erittäin matalaa kynnystä määritelmissä ja tunnussanoissa.
    const isDefinition = cleanMsg.includes("MIKÄ") || cleanMsg.includes("MITÄ") || cleanMsg.length < 30;
    const searchThreshold = (cleanMsg.includes("LTS") || cleanMsg.includes("STR") || cleanMsg.includes("MITEN") || isDefinition) ? 0.005 : 0.05;

    // 5. HIENOSÄÄDETTY PREAMBLE (Suomalainen asiantuntijatyyli)
    const preamble = `
      Olet asiantunteva suomalainen liiketoimintakonsultti ja strateginen sparraaja. Tyylisi on analyyttinen, rauhallinen ja asiallinen.

      SOSIAALINEN SÄVY:
      - Ole kohtelias mutta pidättyväinen. Vältä ylisanoja ja amerikkalaistyylistä innokkuutta.
      - Validoi käyttäjän kysymys asiantuntijanäkökulmasta (esim. "Tämä on keskeinen huomio markkinatilanteessa...").
      - Jos käyttäjä kiittää, kuittaa se lyhyesti ja asiallisesti ja ohjaa takaisin työstettävään aiheeseen.

      HAKUSTRATEGIA JA PÄÄTTELY:
      - JOS vastaus ei löydy suoraan Data Storesta, suuntaa haku välittömästi Googleen.
      - ÄLÄ KOSKAAN vastaa "Yhteenvetoa ei voitu luoda". Jos data on vähissä, käytä asiantuntemustasi selittämään asia yleisellä tasolla ja silloita (bridge) se strategiseen kontekstiin.
      - Suosi asiantuntijalähteitä (McKinsey, HBR, Gartner, PwC, Strategy&) täydentämään portaalin ohjeita.
      - VÄHEMMÄN ON ENEMMÄN: Vastaa tiukasti vain siihen mitä kysytään.

      SPARRAUSOTE:
      - Jos aiheena on kyvykkyys, jäsennä se prosessien, ihmisten osaamisen ja teknologian kautta.
      - Käytä suomea, lihavoi strategiset termit ja käytä tuplarivivaihtoa kappaleiden välillä.

      LOPETA JOKAINEN VASTAUS NÄIN:
      ---
      **Ehdotukset jatkoaskeliksi:**
      * [Lyhyt, asiallinen jatkokysymys juuri tästä aiheesta]
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
