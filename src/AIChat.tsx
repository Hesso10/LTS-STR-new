import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, ShieldCheck, X, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { auth } from './firebase'; // LISÄTTY: Tuodaan auth, jotta saadaan käyttäjän UID

interface AIChatProps {
  onClose?: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { 
      role: 'ai', 
      text: 'Kysy neuvoja minulta. Voit tarkentaa vastauksia kertomalla, minkä otsikon kohtaa työstät.\n\nEsimerkki: **"Mitä kohtia kuuluu ulkoisen toimintaympäristön analyysiin?"**' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    // Tarkistetaan, että käyttäjä on kirjautunut
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sinun täytyy olla kirjautunut sisään käyttääksesi chattia." }]);
      return;
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          sessionId,
          uid: currentUser.uid // LISÄTTY: Lähetetään UID palvelimelle rajoitinta varten
        }),
      });

      // Erityiskäsittely 429-virheelle (raja täynnä)
      if (response.status === 429) {
        const errorData = await response.json();
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: `⚠️ **Kiintiö täynnä:** ${errorData.error || "Kuukausittainen kyselyrajasi on täyttynyt."}` 
        }]);
        return;
      }

      if (!response.ok) throw new Error('Yhteysvirhe palvelimeen');

      const data = await response.json();
      
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'ai', text: "Pahoittelut, yhteys katkesi. Yritä hetken kuluttua uudelleen." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:bottom-6 md:right-6 w-[calc(100%-2rem)] md:w-[450px] h-[600px] md:h-[700px] max-h-[90vh] flex flex-col bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[10000]">
      
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Bot className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight text-slate-100">Strategiasparraaja</h3>
            <div className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Vertex AI Connected</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Pikavinkki (Prompt Tip) */}
      <div className="px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-3">
        <div className="p-1 bg-blue-500/20 rounded">
          <Lightbulb size={14} className="text-blue-400" />
        </div>
        <span className="text-[11px] text-blue-100/80 leading-snug">
          Kokeile: <strong className="text-blue-300">"Hyvä strategia"</strong> tai <strong className="text-blue-300">"Megatrendit Suomi"</strong>
        </span>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-2xl text-sm max-w-[90%] shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
            }`}>
              <div className="prose prose-invert prose-sm max-w-none break-words">
                <ReactMarkdown>{m.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-3 text-slate-400 text-xs animate-pulse ml-2">
            <div className="p-2 bg-slate-800 rounded-full">
              <Loader2 className="animate-spin text-blue-400" size={16} />
            </div>
            <span className="font-medium tracking-wide uppercase italic">Analysoidaan lähteitä...</span>
          </div>
        )}
        {/* Lisätty pieni h-4 marginaali scroll-kohdistimeen */}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Kirjoita kysymys tähän..."
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed p-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center min-w-[48px]"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
