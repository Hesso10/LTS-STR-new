import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

interface AIChatProps {
  onClose?: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Kysy apua AI-avustajalta! Olen valmiina auttamaan sinua strategioihin tai dokumentteihin liittyvissä kysymyksissä.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Automaattinen skrollaus alas uuden viestin tullessa
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          sessionId: sessionId 
        }),
      });

      if (!response.ok) throw new Error('Palvelinvirhe');

      const data = await response.json();
      
      // Tallennetaan sessionId jatkokeskustelua varten
      if (data.sessionId) setSessionId(data.sessionId);

      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      console.error("Chat Error:", err);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Pahoittelut, yhteys tekoälyyn katkesi. Tarkista internetyhteytesi ja yritä uudelleen." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-slate-900 text-white rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
      
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="text-blue-400" size={24} />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-slate-800"></div>
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">Hessonpaja Professional AI</h3>
            <div className="flex items-center gap-1">
              <ShieldCheck size={10} className="text-blue-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Yhdistetty dokumentteihin</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                {m.role === 'user' ? <span className="text-[10px] font-bold">ME</span> : <Sparkles size={12} className="text-blue-300" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
              }`}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="animate-spin text-blue-400" size={16} />
              <span className="text-xs text-slate-400 font-medium italic">Hessonpaja AI hakee vastausta...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800/50 border-t border-slate-700">
        <div className="relative flex items-center gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Kirjoita kysymyksesi tähän..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-500"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`p-3 rounded-xl transition-all ${
              input.trim() && !isTyping 
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40" 
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[9px] text-center text-slate-500 mt-3 uppercase tracking-tighter">
          Tekoäly voi erehtyä. Tarkista tärkeät tiedot alkuperäisistä PDF-dokumenteista.
        </p>
      </div>
    </div>
  );
};
