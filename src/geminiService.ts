import { PortalType } from "./types";

export const getGeminiResponse = async (
  prompt: string, 
  portalType: PortalType, 
  sections: string[]
) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        portalType,
        sections
      }),
    });

    if (!response.ok) throw new Error("Backend connection failed");

    const data = await response.json();
    return data.text; // This will be the "Blended Summary" from your buckets
  } catch (error) {
    console.error('Frontend Error:', error);
    throw error;
  }
};
