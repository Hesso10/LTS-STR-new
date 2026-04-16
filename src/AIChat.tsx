import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, ShieldCheck, X, Lightbulb, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { auth, db } from './firebase'; 
import { doc, getDoc } from 'firebase/firestore';

interface AIChatProps {
  onClose?: () => void;
  portalType?: 'LTS' | 'STRATEGY';
}

export const AIChat: React.FC<AIChatProps> = ({ onClose, portalType = 'LTS' }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { 
      role: 'ai', 
      text: 'Kysy neuvoja minulta. Voit tarkentaa vastauksia kertomalla, minkä otsikon kohtaa työstät.\n\nEsimerkki: **"Mitä kohtia kuuluu ulkoisen toimintaympäristön analyysiin?"**' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleRedTeamChallenge = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || isTyping || isAnalyzing) return;

    setIsAnalyzing(true);
    setIsTyping(true);
    
    try {
      const planRef = doc(db, 'users', currentUser.uid, 'businessPlan', portalType);
      const planSnap = await getDoc(planRef);

      if (planSnap.exists()) {
        const data = planSnap.data();
        let redTeamPrompt = "";

        if (portalType === 'LTS') {
          // --- TUUNATTU LTS: NYT NÄKEE KAIKKI KENTÄT ---
          const ltsContext = `
          LIIKETOIMINTASUUNNITELMAN DATA:
          - Liikeidea (Mitä/Miten/Kenelle): ${data.basics?.businessIdeaWhat || ''} / ${data.basics?.businessIdeaHow || ''} / ${data.basics?.businessIdeaForWhom || ''}
          - Yrityskuvaus: ${data.basics?.companyDescription || 'Ei määritelty'}
          - Markkinan kuvaus: ${data.genericNotes?.marketSize || 'Ei määritelty'}
          - Ostajapersoonat: ${data.buyerPersonas?.map((p: any) => `${p.name}: ${p.description}`).join("; ") || 'Ei määritelty'}
          - Tuotteet & Myyntitavoite: ${data.products?.map((p: any) => `${p.name}: ${p.price}€ x ${p.volume}`).join(", ") || 'Ei määritelty'}
          - Henkilöstörakenne: ${data.personnel?.map((p: any) => `${p.role} (${p.count}hlö, ${p.salary}€/kk)`).join(", ") || 'Ei määritelty'}
          - Markkinointitoimenpiteet: ${data.marketing?.map((m: any) => `${m.activity}: ${m.monthlyCost}€/kk`).join(", ") || 'Ei määritelty'}
          - Hallinnon kulut: ${data.admin?.map((a: any) => `${a.item}: ${a.monthlyCost}€/kk`).join(", ") || 'Ei määritelty'}
          - Investoinnit: ${data.investments?.map((i: any) => `${i.description} ${i.amount}€`).join(", ") || 'Ei määritelty'}
          - Toteutussuunnitelma: ${data.implementationPhases?.map((ph: any) => ph.task).join(" -> ") || 'Ei määritelty'}
          `;

          redTeamPrompt = `Olet tiukka mutta rakentava rahoitusasiantuntija ja enkelisijoittaja. Tehtäväsi on arvioida tämän liiketoimintasuunnitelman rahoituskelpoisuutta ja uskottavuutta.
          
          Analysoi suunnitelmaa seuraavista kulmista:
          1. Myynnin realismi: Onko tuotteiden hinnoittelu ja arvioitu volyymi linjassa markkinakuvauksen ja markkinointitoimenpiteiden kanssa?
          2. Kulurakenteen kestävyys: Riittääkö henkilöstö tavoitteen saavuttamiseen, ja ovatko markkinointi- ja hallintokulut tasapainossa tavoitteen kanssa?
          3. Sijoittajan riski: Mitkä ovat suunnitelman suurimmat sokeat pisteet (esim. puuttuvat ostajapersoonat tai epämääräinen liikeidea)?
          
          Puhu suoraan mutta ammattimaisesti. Lopeta analyysisi AINA listaukseen: "TOP 3 kriittisintä kehityskohdetta rahoituskelpoisuuden varmistamiseksi".\n\n${ltsContext}`;

        } else {
          // --- STR: STRATEGIA- JA LIIKETOIMINTAMALLI-ANALYYSI ---
          const strContext = `
          STRATEGIA-KEHYS:
          - Visio ja Arvot: ${data.strategy?.visionAndValues || 'Ei määritelty'}
          - Nykytila/Diagnoosi: ${data.strategy?.diagnosis || 'Ei määritelty'}
          - Valitut toimenpiteet: ${data.strategy?.howItems?.map((h: any) => h.text).join(", ") || 'Ei määritelty'}
          
          LIIKETOIMINTAMALLI (Business Model):
          - Arvolupaus: ${data.businessModel?.valueProposition || 'Ei määritelty'}
          - Avaintoiminnot & Resurssit: ${data.businessModel?.keyActivities || 'Ei määritelty'} / ${data.businessModel?.keyResources || 'Ei määritelty'}
          - Asiakkaat & Kanavat: ${data.businessModel?.customers || 'Ei määritelty'} / ${data.businessModel?.channels || 'Ei määritelty'}
          - Tulot & Kulut: ${data.businessModel?.revenues || 'Ei määritelty'} / ${data.businessModel?.costs || 'Ei määritelty'}
          `;

          redTeamPrompt = `Olet kokenut strategian ja liiketoimintamallien asiantuntija. Arvioi suunnitelmaa etsimällä "punaista lankaa" ja kokonaisvaltaista eheyttä. 
          Käytä analyysissäsi väljää Strategyzer/Business Model Canvas -logiikkaa ja tarkastele erityisesti:
          1. Strategista jatkumoa: Vastaavatko valitut toimenpiteet suoraan tunnistettuun nykytilaan?
          2. Arvolupauksen istuvuutta: Onko arvolupaus linjassa asiakaskohderyhmän ja yrityksen avainresurssien kanssa?
          3. Mallin toimivuutta: Ovatko liiketoimintamallin palaset (toiminnot, asiakkaat, tulovirrat) keskenään loogisia ja tukeeko malli valittua strategiaa?
          
          Haasta ystävällisesti kohdat, joissa malli on ristiriitainen tai liian yleisellä tasolla. Lopeta analyysisi AINA listaukseen: "TOP 3 tärkeintä askelta strategian ja liiketoimintamallin kirkastamiseksi".\n\n${strContext}`;
        }

        await handleSend(redTeamPrompt); 
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: "⚠️ En löytänyt vielä tallennettua dataa. Muista painaa 'Tallenna' portaalissa, jotta voin analysoida suunnitelmasi!" }]);
      }
    } catch (err) {
      console.error("Red Team Fetch Error:", err);
      setMessages(prev => [...prev, { role: 'ai', text: "Pahoittelut, en saanut haettua tietoja analyysia varten." }]);
    } finally {
      setIsTyping(false);
      setIsAnalyzing(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sinun täytyy olla kirjautunut sisään käyttääksesi chattia." }]);
      return;
    }

    const userMsg = textToSend;
    if (!overrideText) setInput('');
    
    const displayMsg = overrideText ? "🔴 Haasta valmis suunnitelma" : userMsg;
    setMessages(prev => [...prev, { role: 'user', text: displayMsg }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          sessionId,
          uid: currentUser.uid
        }),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        setMessages(prev => [...prev, { role: 'ai', text: `⚠️ **Kiintiö täynnä:** ${errorData.error || "Kuukausittainen kyselyrajasi on täyttynyt."}` }]);
        return;
      }

      if (!response.ok) throw new Error('Yhteysvirhe palvelimeen');
      const data = await response.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
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

      {/* Red Team Nappi hohde-efektillä */}
      <div className="px-4 py-2 border-b border-slate-700 flex gap-2 overflow-x-auto bg-slate-800/30">
        <button 
          onClick={handleRedTeamChallenge}
          disabled={isAnalyzing}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 shadow-sm
            ${isAnalyzing 
              ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-500/20 cursor-wait' 
              : 'bg-red-900/30 border border-red-500/40 text-red-200 hover:bg-red-900/50'
            }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analysoidaan suunnitelmaa...
            </>
          ) : (
            <>
              <ShieldAlert size={14} className="text-red-500" />
              🔴 Haasta valmis suunnitelma
            </>
          )}
        </button>
      </div>

      {/* Pikavinkki */}
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
            <span className="font-medium tracking-wide uppercase italic">Haetaan vastausta...</span>
          </div>
        )}
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
            onClick={() => handleSend()}
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
