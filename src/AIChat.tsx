import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, ShieldCheck } from 'lucide-react';

export const AIChat: React.FC = () => {
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

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, sessionId }),
      });

      const data = await response.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Yhteysvirhe tekoälyyn." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] flex flex-col bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl z-[9999]">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
        <Bot className="text-blue-400" size={24} />
        <div>
          <h3 className="font-bold text-sm">Hessonpaja Professional AI</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
            <ShieldCheck size={10} className="text-blue-400" />
            <span>Dokumentit yhdistetty</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && <Loader2 className="animate-spin text-blue-400 m-2" size={20} />}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Kysy strategioista..."
          />
          <button onClick={handleSend} className="bg-blue-600 p-2 rounded-xl hover:bg-blue-500">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
