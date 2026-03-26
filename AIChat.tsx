import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  MessageSquare, 
  X, 
  ChevronDown,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2
} from 'lucide-react';
import { PortalType, PlanSection, SystemKnowledge, UserAccount } from '../types';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

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
      const systemInstruction = `Olet ystävällinen ja asiantunteva tekoälyavustaja tässä portaalissa.
Portaalin tyyppi on: ${portalType === PortalType.LTS ? 'Liiketoimintasuunnitelma (LTS)' : 'Strategia'}.
Käyttäjän rooli on: ${user?.role || 'Vierailija'}.
Käyttäjä on tällä hetkellä osiossa: ${activeSection || 'Yleinen'}.
Vastaa aina suomeksi, selkeästi ja ammattimaisesti.

Tässä on järjestelmän tietopohja, johon sinun tulee perustaa vastauksesi:
${systemKnowledge.instructions}

Jos käyttäjä kysyy jotain, mihin et löydä vastausta tietopohjasta, kerro ystävällisesti, ettet tiedä vastausta, mutta ohjaa heidät tarvittaessa ottamaan yhteyttä ylläpitoon.`;

      const history = messages.filter(m => m.id !== '1').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const apiMessages = [...history, { role: 'user', parts: [{ text: userMessage.content }] }];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          systemInstruction: systemInstruction
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'model',
        content: '',
        timestamp: Date.now()
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: fullResponse }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error calling Gemini:', error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: 'Oho, tapahtui virhe yhteydessä tekoälyyn. Yritä myöhemmin uudelleen.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatSectionName = (section?: string) => {
    if (!section || section === 'DASHBOARD') return 'Yleisnäkymä';
    return section.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={`flex flex-col h-full bg-white ${isMobile ? '' : 'rounded-none'} overflow-hidden`}>
      {/* Header */}
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-tight text-sm">AI-Avustaja</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Linjoilla</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            {isMobile ? <ChevronDown size={24} /> : <X size={20} />}
          </button>
        )}
      </div>

      {/* Context Tag */}
      <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2 shrink-0">
        <Eye size={14} className="text-emerald-600" />
        <span className="text-xs font-bold text-emerald-800">
          Tekoäly näkee nyt: <span className="uppercase tracking-widest">{formatSectionName(activeSection)}</span>
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-5 rounded-3xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white shadow-lg rounded-tr-sm' 
                  : 'bg-slate-50 text-slate-800 border border-black/5 rounded-tl-sm'
              }`}>
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-50">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center bg-slate-50 p-4 rounded-3xl rounded-tl-sm border border-black/5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tekoäly miettii...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 sm:p-6 border-t border-black/5 bg-white shrink-0">
        <div className="relative flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Kysy tekoälyltä..."
            className="flex-1 bg-slate-50 border border-black/5 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium transition-all resize-none min-h-[52px] max-h-[120px]"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            <Send size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
