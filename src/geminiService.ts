import { GoogleGenAI } from "@google/genai";
import { PortalType } from "./types";

/**
 * Initialize the Google Generative AI SDK.
 * Note: Cloud Run uses the 'GEMINI_API_KEY' environment variable.
 */
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");

export const getGeminiResponse = async (
  prompt: string, 
  portalType: PortalType, 
  sections: string[]
) => {
  try {
    // 1. Using the 2026 version: 'gemini-1.5-flash' is retired.
    // 'gemini-3.1-flash-lite-preview' is the current standard for speed.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview" 
    });

    // 2. Build the context-aware prompt
    const fullPrompt = `
      Käyttäjäympäristö: ${portalType}-portaali.
      Aihealueet: ${sections.join(', ')}.
      
      Tehtävä: Toimi asiantuntijana ja vastaa suomeksi seuraavaan kysymykseen. 
      Käytä ammattimaista sävyä ja viittaa tarvittaessa Tilastokeskuksen dataan.

      Käyttäjän viesti: ${prompt}
    `;

    // 3. Send the request to the API
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Tyhjä vastaus tekoälyltä.");
    }

    return text;

  } catch (error: any) {
    console.error('Gemini API Error:', error);

    // Specific error handling for 404/Access issues
    if (error.message?.includes('404')) {
      return "Virhe: Tekoälymallia ei löytynyt. Ylläpitäjän on tarkistettava mallin saatavuus alueella europe-north1.";
    }

    throw new Error("Tekoälypalveluun ei juuri nyt saada yhteyttä. Yritä uudelleen hetken kuluttua.");
  }
};
