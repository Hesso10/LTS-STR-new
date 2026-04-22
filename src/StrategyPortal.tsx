import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Layout, 
  Building2, 
  ArrowRight,
  Puzzle,
  Info,
  Zap,
  TrendingUp, 
  Compass, 
  X
} from 'lucide-react';
import { UserAccount } from './types';

interface StrategyPortalProps {
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
  viewingWorkspaceAs?: string | null;
}

export const StrategyPortal: React.FC<StrategyPortalProps> = ({ onNavigate, user }) => {
  // State for the guidance overlays - surgical addition
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  const strategyPhases = [
    { 
      id: 'YRITYS', 
      label: '1. YRITYS', 
      desc: 'Määrittele yrityksesi toiminta, osaaminen ja nykytilanne. Tämä luo pohjan koko suunnittelulle.',
      guidance: 'Tunnista organisaatiomallinne: 1. Linjaorganisaatio (perinteinen hierarkia), 2. Matriisiorganisaatio (toiminnot ja tuotelinjat yhdistettynä) vai 3. Projektiorganisaatio (joustava projektipohjainen malli).',
      icon: Building2
    },
    { 
      id: 'YMPÄRISTÖ', 
      label: '2. TOIMINTAYMPÄRISTÖ', 
      desc: 'Tunnista markkinan ja sisäisen toiminnan tärkeimmät ilmiöt. Nämä löydökset siirtyvät automaattisesti strategian diagnoosiin.',
      guidance: 'Mieti, mitkä ulkoiset tekijät (kuten teknologia tai lainsäädäntö) vaikuttavat eniten juuri teidän malliinne.',
      icon: TrendingUp
    },
    { 
      id: 'STRATEGIA', 
      label: '3. STRATEGIA', 
      desc: 'Luo Visio ja perustelet max. kuusi Miten-kohtaa eli kyvykkyyttä, joilla erotut kilpailijoista.',
      guidance: 'Miten organisaatiomallinne tukee näitä valintoja? Valitse kyvykkyydet, jotka antavat teille etulyöntiaseman.',
      icon: Compass
    },
    { 
      id: 'BUSINESS_MODEL', 
      label: '4. LIIKETOIMINTAMALLI', 
      desc: 'Määritä kohderyhmät ja palastele kyvykkyydet käytännön aktiviteeteiksi, resursseiksi ja tuloiksi.',
      guidance: 'Kuka on asiakas ja miksi he ostavat juuri teiltä? Määrittele resurssit, joita strategian toteutus vaatii.',
      icon: Layout
    },
    { 
      id: 'PROJEKTINI', 
      label: '5. PROJEKTINI', 
      desc: 'Toteuta projekti, joka toteuttaa sekä Miten-kohtia että liiketoimintamallin tärkeimpiä resursseja.',
      guidance: 'Valitse projekti, jolla on suurin vaikutus strategian jalkautukseen. Määrittele selkeät vastuuhenkilöt.',
      icon: Puzzle
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
      {/* HEADER: Identical to original structure */}
      <div className="bg-white p-6 md:p-10 rounded-[32px] border border-black/5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <Info size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-5xl font-black tracking-tighter uppercase leading-tight md:leading-none break-words">
              Strategiaprosessi
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed italic text-xs md:text-base mt-2">
              Tervetuloa, {user?.displayName || 'Käyttäjä'}. Strategia on reagointiresepti, joka alkaa analyysillä. Järjestelmä siirtää ympäristön löydökset automaattisesti diagnoosin pohjaksi.
            </p>
          </div>
        </div>
      </div>

      {/* 1-5 VAIHEEN KORTIT */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">Suunnittelun polku</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {strategyPhases.map((phase, index) => (
            <div key={phase.id} className="relative min-h-[220px]">
              {/* Guidance Toggle - Stops propagation to keep navigation logic intact */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveHelp(activeHelp === phase.id ? null : phase.id);
                }}
                className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center z-30 transition-all ${
                  activeHelp === phase.id 
                    ? 'bg-black text-white' 
                    : phase.id === 'STRATEGIA' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {activeHelp === phase.id ? <X size={14} /> : <Info size={14} />}
              </button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onNavigate(phase.id)}
                className={`p-6 rounded-[24px] border border-black/5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden ${
                  phase.id === 'STRATEGIA' ? 'bg-emerald-600 text-white' : 'bg-white'
                }`}
              >
                {/* Main Content Layer - Fades out when help is active */}
                <div className={`transition-opacity duration-300 ${activeHelp === phase.id ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0 ${phase.id === 'STRATEGIA' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <phase.icon size={20} />
                  </div>
                  <h3 className="text-[10px] font-black tracking-widest uppercase mb-2 leading-none">{phase.label}</h3>
                  <p className={`text-[10px] leading-snug font-medium mb-4 ${phase.id === 'STRATEGIA' ? 'text-emerald-50' : 'text-slate-400'}`}>
                    {phase.desc}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${phase.id === 'STRATEGIA' ? 'text-emerald-200' : 'text-slate-300'}`}>Päivitetty</span>
                    <ArrowRight size={14} className={phase.id === 'STRATEGIA' ? 'text-white' : 'text-emerald-500'} />
                  </div>
                </div>

                {/* Guidance Overlay - Fades in over the card */}
                <AnimatePresence>
                  {activeHelp === phase.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 p-6 bg-emerald-50 flex flex-col z-20"
                    >
                      <h4 className="text-[10px] font-black tracking-widest uppercase text-emerald-600 mb-2">Pikaopas</h4>
                      <p className="text-[11px] leading-relaxed text-slate-700 font-medium italic">
                        {phase.guidance}
                      </p>
                      <div className="mt-auto">
                        <span className="text-[8px] font-bold uppercase text-emerald-600/50 italic tracking-widest">Määrittele mallisi</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* ALAKERRAN AI-KORTTI: Identical to original file */}
      <div className="flex justify-center">
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
          className="w-full max-w-4xl bg-emerald-950 p-8 md:p-12 rounded-[40px] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8"
        >
          <div className="relative z-10 flex-1 text-center md:text-left">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 mx-auto md:mx-0">
              <Zap className="text-emerald-400" size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase mb-4 italic">AI-Strategi</h2>
            <p className="text-emerald-100/60 text-sm md:text-base leading-relaxed mb-8">
              Haasta strategiasi ydin asiantuntevan tekoälyn avulla. Saat oivalluksia markkinadatasta ja menestysresepteistä diagnoosisi tueksi.
            </p>
            <button className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
              Aloita sparraus
            </button>
          </div>
          
          <div className="hidden md:block w-px h-32 bg-white/10" />
          
          <div className="relative z-10 flex-shrink-0 text-center">
             <div className="text-emerald-400 font-black text-4xl mb-1">24/7</div>
             <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/40">Strateginen tuki</div>
          </div>

          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />
        </motion.div>
      </div>
    </div>
  );
};
