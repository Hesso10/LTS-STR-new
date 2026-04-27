import React from 'react';
import { motion } from 'motion/react';
import { PortalType } from './types';
import { Layout, Shield, ArrowRight, Play, HelpCircle, ChevronDown, UserCircle } from 'lucide-react'; // Added icons

// --- SUB-COMPONENT: Author/About Me Section ---
// IMPORTANT: Replace the dummy path with the actual path to your image
import AuthorImage from '../assets/images/author-picture.png'; // Example path; change as needed

const AuthorCard = () => {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-xl flex flex-col md:flex-row gap-8 items-center h-full">
      <div className="shrink-0">
        {/* Author Image - circular and defined size */}
        <img 
          src={AuthorImage} 
          alt="Palvelun tekijä" 
          className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-indigo-50 shadow-inner"
        />
      </div>
      <div className="flex-1 text-center md:text-left">
        <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2 block">TIETOA TEKIJÄSTÄ</span>
        <h3 className="text-2xl font-bold mb-4">Tähän nimi</h3> {/* INSERT YOUR NAME HERE */}
        <p className="text-sm md:text-base text-slate-500 mb-6 leading-relaxed">
          Olen kokenut liiketoiminnan kehittäjä ja AI-integraation asiantuntija. 
          Rakensin tämän palvelun, jotta suomalaiset yritykset voisivat 
          suunnitella menestyvää liiketoimintaa nopeammin ja tehokkaammin, 
          hyödyntäen luotettavaa dataa ja tekoälyn sparrausta.
        </p>
        <button className="bg-slate-100 text-slate-700 py-2.5 px-6 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-slate-200 transition-all">
          <UserCircle size={18} />
          Lue lisää tavoitteistamme
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: Q&A Section ---
const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="border-b border-slate-200 py-4 last:border-b-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left font-bold text-slate-800 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-slate-50"
      >
        <span>{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.3 }}
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
      {/* HEADER WITH UPPER-RIGHT TAB REMOVED */}
      <header className="h-16 md:h-20 bg-white border-b border-black/5 flex items-center justify-between px-4 md:px-8 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-lg md:rounded-xl flex items-center justify-center">
            <Layout className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight">LTS & STRATEGIA</span>
        </div>
        {/* The div for the right-side button has been deleted */}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-4xl w-full text-center mt-8 md:mt-0 mb-12 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 md:mb-6 uppercase">SUUNNITTELE LIIKETOIMINTASI</h1>
          <p className="text-base md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Raamita liiketoimintaasi hyvin toimivan liiketoiminnansuunnittelutyökalun avulla. 
            Tukenasi on relevantilla datalla sparrattu AI LLM-malli. Saat apua luotettavan 
            tilastodatan ja hyvin toimineiden liiketoimintahankkeiden esimerkkien avulla.
            {/* Removed the 'Pystyt pienessä ajassa' sentence */}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-5xl mb-16 md:mb-24">
          {/* LTS Portal */}
          <motion.div 
            whileHover={{ y: -8 }}
            className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-xl border border-black/5 flex flex-col h-full"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 md:mb-8">
              <Layout size={24} className="md:w-8 md:h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">LTS</h2>
            <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 flex-1">
              Liiketoimintasuunnitelman rakennusalusta. Tee hyvä liiketoimintasuunnitelma hyödyntämällä markkinadataa, interaktiivista laskuria ja konkariyrittäjien neuvoja.
            </p>
            <ul className="space-y-2 md:space-y-3 mb-8 md:mb-10 text-xs md:text-sm font-medium text-slate-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                Interaktiivinen liiketoimintasuunnitelman rakentaja
              </li>
              {/* --- NEW BULLETS ADDED TO LTS --- */}
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                Toimintaympäristön analyysi
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                Strategia ja osasuunnitelmat
              </li>
              {/* ------------------------------ */}
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                LTS:n tallennus ja analyysi
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                LLM-malli sparrauskumppanina
              </li>
            </ul>
            <div className="space-y-3 mt-auto"> {/* mt-auto to push buttons down */}
              <button 
                onClick={() => onSelectPortal(PortalType.LTS)}
                className="w-full bg-indigo-600 text-white py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Osta käyttöoikeus
                <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => onDemo(PortalType.LTS)}
                className="w-full bg-slate-50 text-slate-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
              >
                <Play size={16} />
                Kokeile demoa
              </button>
              <button 
                onClick={() => onLogin(PortalType.LTS)}
                className="w-full bg-transparent text-indigo-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all border border-indigo-100"
              >
                Luo tunnus / Kirjaudu sisään
              </button>
            </div>
          </motion.div>

          {/* STRATEGY Portal */}
          <motion.div 
            whileHover={{ y: -8 }}
            className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-xl border border-black/5 flex flex-col h-full"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 md:mb-8">
              <Shield size={24} className="md:w-8 md:h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">STRATEGIA</h2>
            <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 flex-1">
              Strategian tekemisen alusta. Vie liiketoimintasi seuraavalle tasolle markkinadataa hyödyntävän dynaamisen strategiatyökalun avulla.
            </p>
            <ul className="space-y-2 md:space-y-3 mb-8 md:mb-10 text-xs md:text-sm font-medium text-slate-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Interaktiivinen suunnitelman rakentaja
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Toimintaympäristön analyysi
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                {/* Fixed casing below */}
                Strategia ja liiketoimintamalli
              </li>
              {/* Removed the 'Strategiaporukan yhteityöalusta' bullet */}
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                LLM-malli sparrauskumppanina
              </li>
            </ul>
            <div className="space-y-3 mt-auto"> {/* mt-auto for alignment */}
              <button 
                onClick={() => onSelectPortal(PortalType.STRATEGY)}
                className="w-full bg-emerald-600 text-white py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
              >
                Osta käyttöoikeus
                <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => onDemo(PortalType.STRATEGY)}
                className="w-full bg-slate-50 text-slate-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
              >
                <Play size={16} />
                Kokeile demoa
              </button>
              <button 
                onClick={() => onLogin(PortalType.STRATEGY)}
                className="w-full bg-transparent text-emerald-600 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all border border-emerald-100"
              >
                Luo tunnus / Kirjaudu sisään
              </button>
            </div>
          </motion.div>
        </div>

        {/* --- NEW SECTION: INFORMATION, AUTHOR, & Q&A --- */}
        <section className="w-full max-w-5xl flex flex-col gap-16 md:gap-24 mb-24">
          
          {/* Author/Tietoa Tekijästä Section */}
          <AuthorCard />

          {/* Q&A Section - organized in two columns for balance */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-12 items-start">
            
            {/* Left Column: Title and Icons */}
            <div className="bg-white/50 p-8 rounded-[32px] border border-white flex md:flex-col items-center md:items-start gap-6 text-center md:text-left h-full">
              <div className="w-16 h-16 shrink-0 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <HelpCircle size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight">
                Usein kysytyt kysymykset (UKK)
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed md:mt-2">
                Tähän voit lisätä lyhyen alkusanan Q&A-osiolle. Esimerkiksi: Löydät vastaukset yleisimpiin kysymyksiin palvelun käytöstä ja tietoturvasta.
              </p>
            </div>

            {/* Right Column: The FAQ Items */}
            <div className="bg-white rounded-[32px] p-6 md:p-10 shadow-xl border border-black/5">
              <FAQItem 
                question="Lisää kysymys 1?" 
                answer="Tähän tulee vastaus ensimmäiseen kysymykseen. Voit kertoa tässä esimerkiksi tekoälyn käytöstä, hinnoittelusta tai käyttöönoton vaivattomuudesta."
              />
              <FAQItem 
                question="Miten tietoturva on huomioitu palvelussa?" 
                answer="Tietoturva on meille ensisijaisen tärkeää. Kaikki data käsitellään luottamuksellisesti suojatuilla palvelimilla, emmekä käytä tietojasi tekoälymallin kouluttamiseen."
              />
              <FAQItem 
                question="Onko demoversio täysin ilmainen?" 
                answer="Kyllä. Voit testata demoversiota ilman sitoumuksia ja kokea, miten työkalu auttaa sinua liiketoiminnan suunnittelussa ennen ostopäätöstä."
              />
               <FAQItem 
                question="Lisää kysymys 4?" 
                answer="Voit jatkaa tätä listaa lisäämällä uusia FAQItem-komponentteja. Suosittelemme 3-5 keskeistä kysymystä."
              />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};
