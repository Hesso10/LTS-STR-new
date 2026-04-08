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

      const data = await response.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Pahoittelut, yhteys tekoälyyn katkesi." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] max-h-[85vh] flex flex-col bg-slate-900 text-white rounded-xl overflow-hidden border border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999]">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-400" size={24} />
          <div>
            <h3 className="font-bold text-sm leading-tight">Hessonpaja Professional AI</h3>
            <div className="flex items-center gap-1">
              <ShieldCheck size={10} className="text-blue-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Yhdistetty dokumentteihin</span>
            </div>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X size={20} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 overscroll-contain">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 rounded-tr-none' : 'bg-slate-800 border border-slate-700 rounded-tl-none'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-slate-400 italic">Hessonpaja AI hakee vastausta...</div>}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Kirjoita kysymyksesi..."
          />
          <button onClick={handleSend} className="bg-blue-600 p-2 rounded-xl"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
};
