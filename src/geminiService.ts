import { PortalType } from "./types";

/**
 * Hakee vastauksen Gemini AI:lta.
 * @param prompt Käyttäjän uusin viesti
 * @param portalType Portaalin tyyppi (LTS/STRATEGY)
 * @param sections Valitut osiot (jos käytössä)
 * @param history Keskusteluhistoria taulukkona
 */
export const getGeminiResponse = async (
  prompt: string, 
  portalType: PortalType, 
  sections: string[],
  history: any[] = []
) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        portalType,
        sections,
        history 
      }),
    });

    if (!response.ok) throw new Error("Backend connection failed");

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Frontend Error:', error);
    throw error;
  }
};
