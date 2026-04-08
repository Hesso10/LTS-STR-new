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

    // Tunnistetaan onko kyseessä LTS- tai STR-haku
    const isTechnical = message.toUpperCase().includes("LTS") || message.toUpperCase().includes("STR");
    
    // Alennetaan kynnystä (threshold), jotta datastore-haku aktivoituu herkemmin tunnussanoilla
    const searchThreshold = isTechnical ? 0.05 : 0.15;

    // OHJEISTUS (PREAMBLE): Hyödyntää PDF-dokumenttien (LTS ja STR ohjeet) sisältöä
    const preamble = `
      Olet Hessonpajan kokenut liiketoimintakonsultti. Käytössäsi on kaksi pääohjetta: "LTS LIIKETOIMINTASUUNNITELMA ohje" ja "STRATEGIA ohje".

      TOIMINTAOHJEET:
      1. TUNNISTA KONTEKSTI: 
         - Jos viestissä on "LTS", käytä ensisijaisena lähteenä LTS-ohjetta.
         - Jos viestissä on "STR", käytä ensisijaisena lähteenä STRATEGIA-ohjetta.
      
      2. OTSIKKOHAKU: 
         - Käyttäjä antaa tunnussanan jälkeen kentän nimen (esim. "LTS Liikeidea").
         - Etsi dokumentista kyseistä otsikkoa vastaava kohta ja
