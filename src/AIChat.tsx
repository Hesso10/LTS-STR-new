import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  X, 
  ChevronDown
} from 'lucide-react';
import { PortalType, SystemKnowledge, UserAccount } from '../types';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

interface AIChatProps {
  portalType: PortalType;
  onClose?: () => void;
  activeSection?: string;
  isMobile?: boolean;
  systemKnowledge: SystemKnowledge;
  user: UserAccount | null;
}

export const AIChat: React.FC<AIChatProps> = ({ portalType, onClose, activeSection, isMobile, systemKnowledge, user }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'model', 
      content: 'Tervetuloa AI-Tukeen! Olen portaalin tekoälyavustaja. Miten voin auttaa sinua tänään?', 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Kutsutaan omaa backendia (Matching our "Winning Brain" server.ts)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content
        })
      });

      if (!response.ok) throw new Error('Yhteysvirhe backend-palvelimeen.');
      
      const data = await response.json();

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: data.text || "Pahoittelut, en saanut vastausta.",
        timestamp: Date.now()
      }]);

    } catch (error: any) {
      console.error("CHAT ERROR:", error.message);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "Virhe: " + error.message,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-400" size={24} />
          <span className="font-bold">Hessonpaja AI</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-800'}`}>
              <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
                {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="prose prose-invert prose-sm">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-slate-400 animate-pulse italic">Hessonpaja AI vastaa...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Kysy strategioista..."
            className="flex-1 bg-slate-700 border-none rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={isTyping}
            className="bg-blue-600 hover:bg-blue-500 p-2 rounded-md transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
