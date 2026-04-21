import React from 'react';
import { motion } from 'motion/react';
import { 
  Target, 
  Shield, 
  Layout, 
  Briefcase, 
  ArrowRight,
  Puzzle,
  Info,
  Zap,
  Globe
} from 'lucide-react';
import { UserAccount } from './types';

interface StrategyPortalProps {
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
  viewingWorkspaceAs?: string | null;
}

export const StrategyPortal: React.FC<StrategyPortalProps> = ({ onNavigate, user }) => {
  // PÄIVITETTY KORTISTO 1-5 VAIHETTA
  const strategyPhases = [
    { 
      id: 'YRITYS', 
      label: '1. YRITYS', 
      desc: 'Määrittele yrityksesi toiminta, osaaminen ja nykytilanne. Tämä luo pohjan koko suunnittelulle.',
      icon: Briefcase
    },
    { 
      id: 'YMPÄRISTÖ', 
      label: '2. TOIMINTAYMPÄRISTÖ', 
      desc: 'Tunnista markkinan ja sisäisen toiminnan tärkeimmät ilmiöt. Nämä löydökset siirtyvät automaattisesti strategian diagnoosiin.',
      icon: Globe
    },
    { 
      id: 'STRATEGIA', 
      label: '3. STRATEGIA', 
      desc: 'Luo Visio ja perustelet max. kuusi Miten-kohtaa eli kyvykkyyttä, joilla erotut kilpailijoista.',
      icon: Shield
    },
    { 
      id: 'BUSINESS_MODEL', 
      label: '4. LIIKETOIMINTAMALLI', 
      desc: 'Määritä kohderyhmät ja palastele kyvykkyydet käytännön aktiviteeteiksi, resursseiksi ja tuloiksi.',
      icon: Layout
    },
    { 
      id: 'PROJEKTINI', 
      label: '5. PROJEKTINI', 
      desc: 'Toteuta projekti, joka toteuttaa sekä Miten-kohtia että liiketoimintamallin tärkeimpiä resursseja.',
      icon: Puzzle
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
      {/* HEADER: OPTIMOITU MOBIILIIN JA POISTETTU TILA-IKONI */}
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
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onNavigate(phase.id)}
              className={`p-6 rounded-[24px] border border-black/5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col min-h-[180px] ${phase.id === 'STRATEGIA' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
            >
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
            </motion.div>
          ))}
        </div>
      </div>

      {/* ALAKERRAN AI-KORTTI */}
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
