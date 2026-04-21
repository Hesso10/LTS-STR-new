import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Target, 
  TrendingUp, 
  Shield, 
  Layout, 
  Briefcase, 
  ArrowRight,
  Puzzle,
  Info,
  Zap,
  Globe
} from 'lucide-react';
import { PortalType, UserAccount, UserRole } from './types';
import { db, auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

interface StrategyPortalProps {
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
  viewingWorkspaceAs?: string | null;
}

export const StrategyPortal: React.FC<StrategyPortalProps> = ({ onNavigate, user, viewingWorkspaceAs }) => {
  const [focusAreas, setFocusAreas] = useState<{title: string, desc: string}[]>([]);

  useEffect(() => {
    const loadData = async () => {
      let parsed = null;

      if (auth.currentUser) {
        try {
          const targetUid = viewingWorkspaceAs || (user?.role === UserRole.TEAM_MEMBER && user?.invitedBy ? user.invitedBy : auth.currentUser.uid);
          const planRef = doc(db, 'users', targetUid, 'businessPlan', 'STRATEGIA');
          const planSnap = await getDoc(planRef);
          if (planSnap.exists()) {
            parsed = planSnap.data();
          }
        } catch (error) {
          console.error("Error fetching strategy data from Firestore:", error);
        }
      }

      if (!parsed) {
        const savedData = localStorage.getItem('business_plan_data_STRATEGIA');
        if (savedData) {
          try {
            parsed = JSON.parse(savedData);
          } catch (e) {
            console.error("Error parsing local storage data", e);
          }
        }
      }

      if (parsed) {
        if (parsed.strategy && parsed.strategy.howItems && parsed.strategy.howItems.length > 0) {
          const parsedAreas = parsed.strategy.howItems.slice(0, 6).map((item: { text: string }, i: number) => {
            const text = item.text.trim();
            if (!text) return null;
            
            const colonMatch = text.match(/^([^:]+):(.*)$/s);
            if (colonMatch) {
              return { title: colonMatch[1].trim(), desc: colonMatch[2].trim() || text };
            }
            
            const periodMatch = text.match(/^([^.]+)\.(.*)$/s);
            if (periodMatch && periodMatch[1].length < 40) {
              return { title: periodMatch[1].trim(), desc: periodMatch[2].trim() || text };
            }
            
            const words = text.split(' ');
            const title = words.length > 3 ? words.slice(0, 3).join(' ') + '...' : `Painopiste ${i + 1}`;
            return { title, desc: text };
          }).filter(Boolean);
          
          setFocusAreas(parsedAreas.length > 0 ? parsedAreas : getDefaultFocusAreas());
        } else {
          setFocusAreas(getDefaultFocusAreas());
        }
      } else {
        setFocusAreas(getDefaultFocusAreas());
      }
    };

    loadData();
  }, [user, viewingWorkspaceAs]);

  const getDefaultFocusAreas = () => [
    { title: 'Ei määritelty', desc: 'Täydennä strategian "Miten"-osiota nähdäksesi painopisteet tässä.' }
  ];

  // PÄIVITETTY KORTISTO 1-5 VAIHETTA (EMERALD-TEEMA)
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
    <div className="space-y-6 md:space-y-12">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 mt-1">
            <Info size={20} />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">Strategiaprosessi</h1>
            <p className="text-slate-500 font-medium leading-relaxed italic text-sm md:text-base mt-2">
              Tervetuloa, {user?.displayName || 'Käyttäjä'}. Strategia on reagointiresepti, joka alkaa analyysillä. Järjestelmä siirtää ympäristön löydökset automaattisesti diagnoosin pohjaksi.
            </p>
          </div>
        </div>
        <div className="bg-white px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-black/5 shadow-sm flex items-center gap-3 w-fit shrink-0 mt-4 md:mt-0">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Strateginen tila: Aktiivinen</span>
        </div>
      </div>

      {/* 1-5 VAIHEEN KORTIT */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {strategyPhases.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNavigate(phase.id)}
            className={`p-6 rounded-[24px] border border-black/5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col ${phase.id === 'STRATEGIA' ? 'bg-emerald-600 text-white' : 'bg-white'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${phase.id === 'STRATEGIA' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <phase.icon size={20} />
            </div>
            <h3 className="text-[10px] font-black tracking-widest uppercase mb-2">{phase.label}</h3>
            <p className={`text-[10px] leading-tight font-medium line-clamp-4 mb-4 ${phase.id === 'STRATEGIA' ? 'text-emerald-50' : 'text-slate-400'}`}>
              {phase.desc}
            </p>
            <div className="mt-auto flex items-center justify-between">
              <span className={`text-[8px] font-bold uppercase tracking-widest ${phase.id === 'STRATEGIA' ? 'text-emerald-200' : 'text-slate-300'}`}>Päivitetty tänään</span>
              <ArrowRight size={14} className={phase.id === 'STRATEGIA' ? 'text-white' : 'text-emerald-500'} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* PAINOPISTEALUEET */}
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-xl">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-emerald-950">Strategiset painopistealueet</h2>
            <button 
              onClick={() => onNavigate('STRATEGIA')}
              className="text-xs font-bold text-emerald-600 uppercase tracking-widest hover:underline"
            >
              Muokkaa
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {focusAreas.map((item, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-black/5">
                <h4 className="font-black text-xs uppercase tracking-widest mb-2 line-clamp-1 text-emerald-900">{item.title}</h4>
                <p className="text-sm text-slate-500 font-medium line-clamp-3 italic">"{item.desc}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI-SPARRAUS */}
        <div className="bg-emerald-950 p-6 md:p-10 rounded-[24px] md:rounded-[40px] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
              <Zap className="text-emerald-400" size={24} />
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase mb-4 italic text-white">AI-Strategi</h2>
            <p className="text-emerald-100/60 text-sm leading-relaxed mb-8">
              Haasta strategiasi ydin asiantuntevan tekoälyn avulla. Saat oivalluksia markkinadatasta ja menestysresepteistä.
            </p>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 relative z-10"
          >
            Aloita sparraus
          </button>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
};
