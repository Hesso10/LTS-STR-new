import express from "express";
import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai"; 
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import admin from "firebase-admin"; 

dotenv.config();

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// --- ASETUKSET ---
const PROJECT_ID = "superb-firefly-489705-g3"; 
const LOCATION = "global"; 
const ENGINE_ID = "lts-str_1775635155437"; 
const MODEL_LOCATION = "us-central1"; 
const MODEL_NAME = "gemini-2.5-flash"; 

const searchClient = new ConversationalSearchServiceClient();
const vertexAI = new VertexAI({ project: PROJECT_ID, location: MODEL_LOCATION });

const googleSearchTool: any = { google_search: {} };

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

app.post("/api/chat", async (req, res) => {
  try {
    let { message, sessionId, history = [], uid } = req.body;
    
    if (!message || !uid) return res.status(400).json({ error: "Tietoja puuttuu" });

    // --- TUPLAVARMISTUS: SIIVOTAAN TYHJÄT JA "EI MÄÄRITELTY" -RIVIT POIS SYÖTTEESTÄ ---
    if (
      message.includes("LIIKETOIMINTASUUNNITELMAN DATA:") || 
      message.includes("STRATEGIA-KEHYS:") ||
      message.includes("TOIMINTAYMPÄRISTÖ:") ||
      message.includes("PERUSTEET:") ||
      message.includes("OSASUUNNITELMAT:")
    ) {
      message = message
        .split("\n")
        .filter((line: string) => {
          const trimmed = line.trim();
          // Suodatetaan pois rivit, jotka loppuvat "Ei määritelty", ovat tyhjiä tai sisältävät pelkkiä tyhjiä arvoja erottimien välissä
          return !(
            trimmed.endsWith("Ei määritelty") ||
            trimmed === "" ||
            trimmed.match(/:\s*(\/\s*)*$/) // Poistaa esim. "Liikeidea:  /  / "
          );
        })
        .join("\n");
    }

    // --- PUHDISTETAAN HISTORIA VERTEX AI:LLE ---
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
      parts: msg.parts || [{ text: msg.text }]
    }));

    // --- SECURITY LAYER 1: INPUT SANITIZATION ---
    const lowerMessage = message.toLowerCase();
    const forbiddenTerms = ["system instruction", "pysy roolissa", "tulosta ohjeet", "ignore previous instructions", "developer mode"];
    if (forbiddenTerms.some(term => lowerMessage.includes(term))) {
      return res.json({ 
        text: "Olen pahoillani, mutta toimin vain liiketoimintastrategina enkä voi paljastaa sisäisiä ohjeitani." 
      });
    }

    // --- 1. LASKURIN TARKISTUS ---
    const now = new Date();
    const monthId = `${now.getFullYear()}-${now.getUTCMonth() + 1}`;
    const usageRef = db.collection("users").doc(uid).collection("usage").doc("currentMonth");

    try {
      const usageDoc = await usageRef.get();
      if (usageDoc.exists && usageDoc.data()?.count >= 100) {
        return res.status(429).json({ error: "Kuukausiraja täynnä." });
      }
    } catch (e) { console.error(e); }

    // --- 2. HAKU PDF-DATASTA ---
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}/servingConfigs/default_search`;
    let context = "";
    try {
      const [searchResponse] = await searchClient.answerQuery({
        servingConfig,
        query: { text: message },
        answerGenerationSpec: { answerLanguageCode: "fi" }
      });
      context = searchResponse.answer?.answerText || "";
    } catch (e) { console.error("Search error", e); }

    // --- 3. OHJEISTUS (ALKUPERÄINEN SYSTEM INSTRUCTION CHATTIIN) ---
    const instructionText = `
### TURVALLISUUS JA IDENTITEETTI
- Toimit asiantuntevana suomalaisena liiketoimintastrategina.
- Analysoi ja haasta portaalin suunnitelmia sivistyneen rahoittajan tai akateemisen arvioijan roolissa.
- Älä kommentoi tai listaa raporttiin kohtia, joita käyttäjä ei ole vielä määritellyt tai täyttänyt.

### DATA-KENTTIEN TUNNISTAMINEN SYÖTTEESTÄ
Käyttäjän syöte jäsentyy portaalista riippuen seuraavien pääotsikoiden alle:
- **PERUSTEET (Vain LTS-portaali):** Sisältää kentät Yritysmuoto, Taustani ja Liikeidea.
- **TOIMINTAYMPÄRISTÖ (Molemmat portaalit):** Sisältää kentät "Ulkoinen toimintaympäristö" (markkinat, ilmiöt, uhat, mahdollisuudet) ja "Sisäinen toimintaympäristö" (nykytila, omat resurssit, rajoitteet). Nämä kaksi muodostavat strategisen diagnoosin perustan. Älä väitä analyysin puuttuvan, jos näissä on tekstiä.
- **STRATEGIA (Molemmat portaalit):** This main header hides fields **Vision**, **Values** (and Value Proposition) and **How section** (capabilities, resources and key activities). Identify these three elements under the STRATEGIA header.
- **OSASUUNNITELMAT (Vain LTS-portaali):** Sisältää operatiiviset osat: Markkinointi & myynti, Henkilöstö, Hallinto ja Laskelmat.
- **LIIKETOIMINTAMALLI (Vain STR-portaali):** Sisältää strategiset rakenteet: Asiakkaat, Kanavat, Tulot ja Kulut.

### HAASTA SUUNNITELMA -TOIMINTAOHJE (KOKO STRATEGINEN JATKUMO)
Kun käyttäjä pyytää haastamaan tai arvioimaan suunnitelmaa (painamalla "Haasta suunnitelma" -nappia, jolloin syötteessä on "LIIKETOIMINTASUUNNITELMAN DATA:" tai "STRATEGIA-KEHYS:"), sinun on arvioitava koko ketjun loogista jatkuvuutta alusta loppuun:
- Tyylisi tässä toiminnossa on asiallinen, rakentava ja herättelevä. Älä ole epäkohtelias, mutta älä myöskään myötäile tai kehu suunnitelmaa itsestäänselvyyksillä tai toista syötteen tekstiä suoraan takaisin.
- Älä koskaan selitä auki liiketoiminnan käsitteitä tai määritelmiä (esim. älä selitä mitä "arvolupaus" tarkoittaa). Mene suoraan asiaan.

1. **Visio ja Arvot suhteessa Toimintaympäristöön:** Tarkista, ohjaavatko STRATEGIA-otsikon alta löytyvät Visio ja Arvot loogisesti vastaamaan niihin reuna-ehtoihin, joita Ulkoinen ja Sisäinen toimintaympäristö asettavat (LTS-puolella peilaa myös PERUSTEET-osion liikeideaan).
2. **Toimintaympäristö (Ulkoinen & Sisäinen) suhteessa Miten-kohdan kyvykkyyksiin:** Osoita paikat, joissa STRATEGIA-otsikon sisältämä "Miten-kohta" (kyvykkyydet) ei loogisesti vastaa toimintaympäristön analyysissa listattuihin todellisiin haasteisiin tai mahdollisuuksiin.
3. **Miten-kohta suhteessa Loppuosien toteutukseen:**
   - **LTS (Liiketoimintasuunnitelma):** Haasta sitä, onko "Miten"-kohdan kyvykkyyksille (esim. AI-webapp, valmentajat, tilat) osoitettu todelliset teot ja resurssit **OSASUUNNITELMAT**-osion alla (Markkinointi & myynti, Henkilöstö, Hallinto, Laskelmat).
   - **STR (Strategia):** Haasta sitä, tukeeko ja mahdollistaako pääotsikon **LIIKETOIMINTAMALLI** alle täytetyt rakenteet (asiakkaat, kanavat, tulot, kulut) "Miten"-kohdan strategisten kyvykkyyksien täyden hyödyntämisen.

### VASTAUKSEN RAKENNE (HAASTA SUUNNITELMA)
Tulosta analyysi täsmälleen tässä muodossa, ilman turhia johdantolöpötyksiä:

- **Huomioita strategisesta jatkumosta (Visio -> Toimintaympäristö -> Miten):** Nosta esiin 1-2 konkreettista huomiota tai loogista sokeaa pistettä siitä, miten yrityksen suunta (Visio/Arvot) and toimintaympäristön analyysi (Ulkoinen/Sisäinen) kohtaavat tai jättävät kohtaamatta STRATEGIA-otsikon "Miten"-kohdan kyvykkyyksissä.
- **Huomioita toteutuksesta ja rakenteesta (Miten -> Loppuosat):** [Jos kyseessä on LTS] Nosta esiin, miten loogisesti kyvykkyydet jalkautuvat OSASUUNNITELMIIN (Markkinointi & myynti, Henkilöstö, Hallinto, Laskelmat).
  [Jos kyseessä on STR] Nosta esiin, miten loogisesti kyvykkyydet integroituvat valittuun LIIKETOIMINTAMALLIIN ja sen rakenteisiin (asiakkaat, kanavat, tulot, kulut).
- **TOP 3 Kysymystä kokonaisuuden kirkastamiseksi:** Esitä 3 suoraa, oivaltavaa ja herättelevää kysymystä, jotka pakottavat käyttäjän perustelemaan ja sitomaan koko ketjun ehjäksi kokonaisuudeksi.

LÄHDE-DATA PDF-TIETOKANNASTA: "${context}"
    `;

    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      tools: [googleSearchTool],
      generationConfig: { temperature: 0.3, topP: 0.8 },
      safetySettings,
      systemInstruction: {
        role: "system",
        parts: [{ text: instructionText }]
      }
    });

    // --- 4. MUISTILLA VARUSTETTU VASTAUS ---
    const result = await generativeModel.generateContent({
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: `KÄYTTÄJÄN KYSYMYS JA DATA:\n${message}` }] }
      ]
    });

    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Virhe vastauksen hakemisessa.";

    // --- 5. LASKURIN PÄIVITYS ---
    try {
      await usageRef.set({
        count: admin.firestore.FieldValue.increment(1),
        monthId: monthId,
        userId: uid
      }, { merge: true });
    } catch (e) { console.error(e); }

    res.json({ text: responseText, sessionId });

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Palvelinvirhe" });
  }
});

// --- UUSI REITTI: ANALYSOI LUONNOS (STATELESS PIKAPALAUTE NAPPEIHIN) ---
app.post("/api/analyze", async (req, res) => {
  try {
    const { step, content } = req.body;
    
    if (!step || !content) {
      return res.status(400).json({ error: "Vaihe (step) tai sisältö (content) puuttuu." });
    }

    // PAKOTETAAN STEP ISOIKSI KIRJAIMIKSI VERTAILUA VARTEN
    const normalizedStep = step.toUpperCase();
    let stepInstruction = "";

    switch (normalizedStep) {
      case "PERUSTEET":
      case "BUSINESSIDEA":
      case "BUSINESS_IDEA":
        stepInstruction = "Arvioi liikeidean kirkkautta ja sen osien (Mitä, Miten, Kenelle) loogista yhtenäisyyttä. Anna rakentavaa palautetta siitä, onko kohderyhmä riittävän tarkka.";
        break;
      case "COMPANY_FORM":
      case "COMPANYFORM":
        stepInstruction = "Arvioi valittua yritysmuotoa. Huomioi, antaako käyttäjä hyvät perustelut valinnalleen ja sopiiko se suunniteltuun liiketoimintaan. Haasta pohtimaan vastuita ja rahoitusta.";
        break;
      case "BACKGROUND":
        stepInstruction = "Arvioi käyttäjän taustaa ja osaamista suhteessa liikeideaan. Kerro, mitkä vahvuudet korostuvat ja mitä osaamisalueita kannattaisi mahdollisesti vahvistaa tai ulkoistaa.";
        break;
      case "STRATEGIA":
        stepInstruction = "Arvioi vision, diagnoosin ja toimenpiteiden (Miten) välistä loogista ketjua. Varmista, että toimenpiteet vastaavat suoraan diagnoosissa esiin nostettuihin haasteisiin.";
        break;
      case "BUSINESS_MODEL":
        stepInstruction = "Arvioi liiketoimintamallin (Business Model Canvas) kokonaisuutta. Tarkastele erityisesti arvolupauksen ja asiakassegmenttien välistä suhdetta.";
        break;
      case "EXTERNAL_ENV":
      case "YMPÄRISTÖ":
        stepInstruction = "Arvioi ulkoisen toimintaympäristön analyysia (mahdollisuudet ja uhat). Auta tunnistamaan, ovatko ilmiöt konkreettisia ja markkinalähtöisiä.";
        break;
      case "INTERNAL_ENV":
        stepInstruction = "Arvioi sisäisen toimintaympäristön analyysia (vahvuudet ja heikkoudet). Arvioi, ovatko ne realistisia ja auttavatko ne yritystä erottumaan.";
        break;
      case "PERSONNEL":
        stepInstruction = "Arvioi henkilöstösuunnitelmaa ja roolituksia. Tarkastele, onko resursointi tasapainossa kaavailtujen kasvutavoitteiden ja operatiivisen toiminnan kanssa.";
        break;
      case "SALES_MARKETING":
        stepInstruction = "Arvioi markkinointi- ja myyntistrategiaa, valittuja kanavia sekä budjetointia. Anna vinkkejä siitä, ovatko kanavavalinnat loogisia ostajapersooniin nähden.";
        break;
      case "HALLINTO":
        stepInstruction = "Arvioi hallinnon, lupien ja kiinteiden kulujen kokonaisuutta. Huomioi, onko jokin kriittinen yrityksen pyörittämiseen liittyvä kulu tai lupa mahdollisesti unohtunut.";
        break;
      case "LASKELMAT":
        stepInstruction = "Analyseeraa koottuja talouslukuja ja budjetin tasapainoa. Huomauta ystävällisesti, jos käyttökate (EBITDA) näyttää pahasti miinusmerkkielten tai jos kulurakenne vaikuttaa epärealistisen matalalta tuottoihin nähden.";
        break;
      case "TOTEUTUS":
      case "CONTRIBUTION":
        stepInstruction = "Arvioi projektin vaiheita, aikataulutusta ja toteutussuunnitelmaa. Anna palautetta siitä, ovatko askeleet riittävän konkreettisia ja etenemistahti realistinen.";
        break;
      default:
        stepInstruction = "Arvioi luonnosta kriittisesti ja anna konkreettisia parannusehdotuksia pallerolistaa hyödyntäen.";
        break;
    }

    // --- UUSI SUUNNATTU SYSTEM INSTRUCTION VAIN LUONNOSANALYYSILLE ---
    const systemInstructionText = `
Toimit asiantuntevana suomalaisena liiketoimintastrategina ja sparraajana.
Tehtäväsi on antaa napakkaa, rohkaisevaa ja erittäin käytännönläheistä palautetta käyttäjän syöttämästä luonnoksesta.

Noudata täsmällisesti tätä osiokohtaista täsmäohjetta:
"${stepInstruction}"

### TIUKAT SÄÄNNÖT VASTAUKSELLE:
1. Mene SUORAAN asiaan. Älä kirjoita mitään esittelyä, johdantoa tai aloituslausetta.
2. Älä koskaan toista saamaasi täsmäohjetta tai sen sanoja vastauksessasi. Aloita vastaus suoraan ensimmäisestä bullet-pointista.
3. Älä selitä auki liiketoiminnan käsitteitä tai oppikirjamääritelmiä. 
4. Anna palaute tiiviisti ja helposti sulatettavassa muodossa, käyttäen Markdownin bullet-pointteja (pallerolistoja).
5. Vastaa aina suomen kielellä napakan rohkaisevasti.
    `;

    // --- TILATON (STATELESS) GEMINI-KUTSU ---
    const generativeModel = vertexAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      generationConfig: { temperature: 0.2, topP: 0.8 },
      safetySettings,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstructionText }]
      }
    });

    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: `KÄYTTÄJÄN LUONNOS VAIHEESTA [${step}]:\n${content}` }] }]
    });

    const responseText = result.response.candidates?.[0].content.parts?.[0].text || "Palautteen generointi epäonnistui.";

    res.json({ analysis: responseText });

  } catch (err) {
    console.error("Analyze API Error:", err);
    res.status(500).json({ error: "Sisäinen palvelinvirhe analysoinnissa." });
  }
});

// --- STAATTISTEN TIEDOSTOJEN JA PALVELIMEN KÄYNNISTYKSEN LOPPUOSA ---

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
      res.status(404).send("Index.html not found in dist");
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

    
