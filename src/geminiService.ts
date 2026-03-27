import { GoogleGenAI } from "@google/genai";
import { PortalType } from "./types";

// 1. Initialize the SDK
// Make sure you have GEMINI_API_KEY in your Cloud Run Environment Variables
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");

export const getGeminiResponse = async (prompt: string, portalType: PortalType, sections: string[]) => {
  try {
    // 2. Use the 2026 stable model ID
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview" 
    });

    // 3. Construct a better prompt using your portal context
    const fullPrompt = `
      Context: User is in the ${portalType} portal.
      Focus Areas: ${sections.join(', ')}
      
      User Message: ${prompt}
      
      Please provide a professional response in Finnish, citing relevant data if applicable.
    `;

    // 4. Call the real API
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return text;

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    // Friendly error for the UI
    if (error.message?.includes('404')) {
      return "Virhe: Tekoälymallia ei löytynyt. Ylläpitäjän on päivitettävä malliversio (Gemini 3.1).";
    }
    
    throw new Error("Yhteysvirhe tekoälypalveluun.");
  }
};
