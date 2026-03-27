import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  X, 
  ChevronDown,
  Eye
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
      // Muodostetaan ohjeistus tekoälylle
      const systemInstruction = `Olet ystävällinen ja asiantunteva tekoälyavustaja tässä portaalissa.
Portaalin tyyppi on: ${portalType === PortalType.LTS ? 'Liiketoimintasuunnitelma (LTS)' : 'Strategia'}.
Käyttäjän rooli on: ${user?.role || 'Vierailija'}.
Käyttäjä on tällä hetkellä osiossa: ${activeSection || 'Yleinen'}.
Vastaa aina suomeksi, selkeästi ja ammattimaisesti.

Tässä on järjestelmän tietopohja, johon sinun tulee perustaa vastauksesi:
${systemKnowledge.instructions}

Jos käyttäjä kysyy jotain, mihin et löydä vastausta tietopohjasta, kerro ystävällisesti, ettet tiedä vastausta, mutta ohjaa heidät tarvittaessa ottamaan yhteyttä ylläpitoon.`;

      // Muotoillaan viestihistoria backendille sopivaksi (Vertex AI -muoto)
      const history = messages.filter(m => m.id !== '1').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const apiMessages = [...history, { role: 'user', parts: [{ text: userMessage.content }] }];

      // Kutsutaan omaa backendia
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

      if (!response.ok) throw new Error('Yhteysvirhe backend-palvelimeen.');
      if (!response.body) throw new Error('Vastaus puuttuu.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      const assistantMessageId = (Date.now() + 1).toString();
      
      // Lisätään tyhjä viesti, jota päivitetään striimin edetessä
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'model',
        content: '',
        timestamp: Date.now()
      }]);

      while (true) {
