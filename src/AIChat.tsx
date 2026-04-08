import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

interface AIChatProps {
  onClose?: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Tervehdys! Olen valmiina auttamaan sinua strategioihin tai dokumentteihin liittyvissä kysymyksissä.' }
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
        body: JSON.stringify({ message: userMessage, sessionId }),
      });

      if (!response.ok) throw new Error('Yhteysvirhe');

      const data = await response.json();
      
      // Update session ID for the next message to keep context
      if (data.sessionId) setSessionId(data.sessionId);

      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Pahoittelut, yhteys tekoälyyn katkesi. Yritä uudelleen." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] flex flex-col bg-slate-900 text-white rounded-xl overflow-hidden border border-slate-700 shadow-2xl z-[9999]">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-400" size={24} />
          <div>
            <h3 className="font-bold text-sm">Hessonpaja Professional AI</h3>
            <div className="flex items-center gap-1">
              <ShieldCheck size={10} className="text-blue-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Päivitetty: {new Date().toLocaleDateString('fi-FI')}</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 overscroll-contain">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${
              m.role === 'user' ? 'bg-blue-600 rounded-tr-none' : 'bg-slate-800 border border-slate-700 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2 items-center text-xs text-slate-400 italic">
            <Loader2 className="animate-spin" size={14} />
            Hakee tietoa dokumenteista...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Kirjoita kysymyksesi..."
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
