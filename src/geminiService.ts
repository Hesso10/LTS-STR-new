import { GoogleGenAI } from "@google/genai";
import { PortalType } from "./types";

// Mock service for now as user will connect real logic later
export const getGeminiResponse = async (prompt: string, portalType: PortalType, sections: string[]) => {
  console.log('AI Request:', { prompt, portalType, sections });
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return `Analysoin kysymystäsi liittyen osa-alueisiin: **${sections.join(', ')}**. 

Tilastokeskuksen ja muiden lähteiden perusteella tässä on muutama huomio:

- **Markkinatilanne:** Alallasi on tällä hetkellä kasvupainetta.
- **Suositus:** Painota enemmän digitaalista näkyvyyttä.

Lähde: Tilastokeskus 2024`;
};
