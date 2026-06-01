import React from 'react';
import { motion } from 'motion/react';
import { PortalType } from './types';
import { Layout, Shield, ArrowRight, Play, HelpCircle, ChevronDown, UserCircle } from 'lucide-react';

// --- ADDED IMPORT TO MATCH YOUR ROOT FILE ---
import JohannesPic from '../Johannes.jpg';

// --- SUB-COMPONENT: Author/About Me Section ---
const AuthorCard = () => {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-xl flex flex-col md:flex-row gap-8 items-center h-full">
      <div className="shrink-0">
        {/* Profile Image Container */}
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100 flex items-center justify-center">
          <img 
            src={JohannesPic} 
            alt="Johannes Hesso"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Safety fallback: if image fails, show the letter H as before
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<span class="text-indigo-600 text-4xl md:text-5xl font-black">H</span>';
              }
            }}
          />
        </div>
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2 block">TIETOA TEKIJÄSTÄ</span>
        
        {/* NAME UPDATED TO HESSO */}
        <h3 className="text-2xl font-bold mb-4">Johannes Hesso</h3> 
        
        {/* BIO TEXT - IDENTICAL TO SUCCESSFUL BUILD */}
        <p className="text-sm md:text-base text-slate-500 mb-6 leading-relaxed">
          Johannes Hesso on kirjoittanut lukuisia kirjoja liiketoimintasuunnitelmista ja yrityksen liiketoiminnan kehittämisestä sekä toiminut asiantuntija Suomessa 20 vuoden ajan. Suunnitelma.com yhdistää hyväksi koetun LTS- ja strategiamallin Google Vertex Ai RAG -mallin kykyyn löytää ajankohtaista markkinadataa ja case-esimerkkejä
          Suomesta ja maailmalta. Interaktiivnen suunnitelma.com mahdollistaa yrityksen liiketoiminnan suunnittelun ja haastamisen tässä ja nyt valjastamalla julkinen data ja fiksusti sparrattu tekoälymalli avuksesi. 
        </p>
        
        <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-600 font-medium">
          <UserCircle size={18} />
          <span>Palvelun kehittäjä</span>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: Q&A Section (Identical) ---
const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="border-b border-slate-200 py-4 last:border-b-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left font-bold text-slate-800 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-slate-50"
      >
        <span>{question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={20} />
        </motion.div>
      </button>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="text-slate-500 mt-2 text-sm leading-relaxed p-2 pt-0"
        >
          {answer}
        </motion.div>
      )}
    </div>
  );
};

interface LandingPageProps {
  onSelectPortal: (portal: PortalType) => void;
  onDemo: (portal: PortalType) => void;
  onLogin: (portal?: PortalType) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectPortal, onDemo, onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="h-16 md:h-20 bg-white border-b border-black/5 flex items-center justify-between px-4 md:px-8 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-lg md:rounded-xl flex items-center justify-center">
            <Layout className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight">LTS & STRATEGIA</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        {/* HERO SECTION */}
        <div className="max-w-4xl w-full text-center mt-8 md:mt-0 mb-12 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 md:mb-6 uppercase">SUUNNITTELE LIIKETOIMINTASI</h1>
          <p className="text-base md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Raamita liiketoimintaasi hyvin toimivan liiketoiminnansuunnittelutyökalun avulla. 
            Tukenasi on relevantilla datalla sparrattu AI LLM-malli. Saat apua luotettavan 
            tilastodatan ja hyvin toimineiden liiketoimintahankkeiden esimerkkien avulla.
          </p>
        </div>

        {/* PORTAL CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-5xl mb-16 md:mb-24">
          {/* LTS Card */}
          <motion.div whileHover={{ y: -8 }} className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-xl border border-black/5 flex flex-col h-full">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 md:mb-8">
              <Layout size={24} className="md:w-8 md:h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">LTS</h2>
            <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 flex-1">
              Liiketoimintasuunnitelman rakennusalusta. Tee hyvä liiketoimintasuunnitelma hyödyntämällä markkinadataa, interaktiivista laskuria ja konkariyrittäjien neuvoja.
            </p>
            <ul className="space-y-2 md:space-y-3 mb-8 md:mb-10 text-xs md:text-sm font-medium text-slate-600">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Interaktiivinen liiketoimintasuunnitelman rakentaja</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Toimintaympäriorientointi / analyysi</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Strategia ja osasuunnitelmat</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> LTS:n tallennus ja analyysi</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> LLM-malli sparrauskumppanina</li>
            </ul>
            <div className="space-y-3 mt-auto">
              {/* PAY NOW BUTTON TEMPORARILY HIDDEN
              <button onClick={() => onSelectPortal(PortalType.LTS)} className="w-full bg-indigo-600 text-white py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                Osta käyttöoikeus <ArrowRight size={18} />
              </button>
              */}
              <button onClick={() => onDemo(PortalType.LTS)} className="w-full bg-slate-50 text-slate-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                <Play size={16} /> Kokeile demoa
              </button>
              <button onClick={() => onLogin(PortalType.LTS)} className="w-full bg-transparent text-indigo-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all border border-indigo-100">
                Luo tunnus / Kirjaudu sisään
              </button>
            </div>
          </motion.div>

          {/* STRATEGY Card */}
          <motion.div whileHover={{ y: -8 }} className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-xl border border-black/5 flex flex-col h-full">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 md:mb-8">
              <Shield size={24} className="md:w-8 md:h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">STRATEGIA</h2>
            <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 flex-1">
              Strategian tekemisen alusta. Vie liiketoimintasi seuraavalle tasolle markkinadataa hyödyntävän dynaamisen strategiatyökalun avulla.
            </p>
            <ul className="space-y-2 md:space-y-3 mb-8 md:mb-10 text-xs md:text-sm font-medium text-slate-600">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Interaktiivinen suunnitelman rakentaja</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Toimintaympäristön analyysi</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Strategia ja liiketoimintamalli</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> LLM-malli sparrauskumppanina</li>
            </ul>
            <div className="space-y-3 mt-auto">
              {/* PAY NOW BUTTON TEMPORARILY HIDDEN
              <button onClick={() => onSelectPortal(PortalType.STRATEGY)} className="w-full bg-emerald-600 text-white py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                Osta käyttöoikeus <ArrowRight size={18} />
              </button>
              */}
              <button onClick={() => onDemo(PortalType.STRATEGY)} className="w-full bg-slate-50 text-slate-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                <Play size={16} /> Kokeile demoa
              </button>
              <button onClick={() => onLogin(PortalType.STRATEGY)} className="w-full bg-transparent text-emerald-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all border border-emerald-100">
                Luo tunnus / Kirjaudu sisään
              </button>
            </div>
          </motion.div>
        </div>

        {/* --- INFORMATION & Q&A SECTION --- */}
        <section className="w-full max-w-5xl flex flex-col gap-16 md:gap-24 mb-24 px-4">
          <AuthorCard />
          <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-12 items-start">
            <div className="bg-white/50 p-8 rounded-[32px] border border-white flex md:flex-col items-center md:items-start gap-6 text-center md:text-left h-full">
              <div className="w-16 h-16 shrink-0 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <HelpCircle size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                Usein kysytyt kysymykset
              </h2>
            </div>

            <div className="bg-white rounded-[32px] p-6 md:p-10 shadow-xl border border-black/5">
              <FAQItem 
                question="Miten aloitan palvelun käytön?" 
                answer="Valitse haluamasi portaali (LTS tai STRATEGIA) ja kirjaudu sisään. Voit myös kokeilla demoa ennen ostopäätöstä."
              />
              <FAQItem 
                question="Mitä LLM-malli tarkoittaa tässä yhteydessä?" 
                answer="Käytämme uusimpia kielimalleja (kuten Gemini), jotka on ohjeistettu auttamaan nimenomaan liiketoiminnan suunnittelussa suomalaisessa markkinassa."
              />
              <FAQItem 
                question="Voinko muokata suunnitelmiani myöhemmin?" 
                answer="Kyllä, kaikki suunnitelmasi tallentuvat tunnuksellesi ja voit palata muokkaamaan niitä milloin tahansa."
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
