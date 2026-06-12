import React, { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface AiAnalysisPanelProps {
  step: string;
  content: any; // Ottaa vastaan joko tekstin, objektin tai taulukon
  isReadOnly?: boolean;
}

export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({ step, content, isReadOnly = false }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Nollataan vanha analyysitulos aina kun vaihe vaihtuu
  useEffect(() => {
    setResult(null);
  }, [step]);

  // Jos ollaan katselutilassa, ei näytetä koko paneelia
  if (isReadOnly) return null;

  const handleAnalyze = async () => {
    if (isReadOnly) {
      setResult("💡 **Tekoälyanalyysi (Demo):** Luonnoksesi näyttää hyvältä! Oikeassa versiossa järjestelmä ajaa tässä kohdassa täydellisen analyysin hyödyntäen Google Vertex AI -mallia ja ajankohtaista markkinadataa. Luo oma tunnus testataksesi toiminnallisuutta.");
      return;
    }

    let payloadContent = '';

    // Muutetaan content-prop tekstiksi sen tyypin mukaan
    if (typeof content === 'string') {
      payloadContent = content;
    } else if (content && typeof content === 'object') {
      payloadContent = JSON.stringify(content, null, 2);
    }

    // Tarkistetaan, onko jotain analysoitavaa
    if (!payloadContent || payloadContent.trim().length < 10 || payloadContent === '{}' || payloadContent === '[]') {
      setResult("Kirjoita tai täytä ensin hieman enemmän luonnosta (vähintään muutama sana), jotta tekoäly voi analysoida sitä.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, content: payloadContent })
      });
      
      const resData = await res.json();
      
      if (res.ok) {
        setResult(resData.analysis);
      } else {
        setResult("Virhe analysoinnissa: " + (resData.error || 'Tuntematon virhe'));
      }
    } catch (e) {
      setResult("Virhe yhteydessä palvelimeen. Varmista, että API-reitti on pystyssä.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-black/5 shadow-lg overflow-hidden mt-6">
      <div className="p-4 sm:p-5 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-black/5">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wider">
          <Bot className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>Testaa ja analysoi luonnos</span>
        </div>
        <button 
          onClick={handleAnalyze} 
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed shrink-0 whitespace-nowrap w-full sm:w-auto text-center justify-center flex items-center gap-2 active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analysoidaan...</span>
            </>
          ) : (
            <span>Analysoi luonnos</span>
          )}
        </button>
      </div>
      
      {result && (
        <div className="p-6 text-sm text-slate-700 bg-white prose prose-sm max-w-none border-t border-black/5 leading-relaxed">
          <div className="markdown-body font-medium">
            <Markdown>{result}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
