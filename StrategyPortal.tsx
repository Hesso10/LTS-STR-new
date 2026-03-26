import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Shield, 
  Layout, 
  Briefcase, 
  ArrowRight,
  FileText,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';
import { PortalType, UserAccount, UserRole } from '../types';
import { db, auth } from '../firebase';
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
        } else if (parsed.strategy && parsed.strategy.how && parsed.strategy.how.trim()) {
          const text = parsed.strategy.how;
          const lines = text.split(/\n/).map((l: string) => l.replace(/^[-*•]\s*/, '').trim()).filter((l: string) => l.length > 0);
          
          const parsedAreas = lines.slice(0, 6).map((line: string, i: number) => {
            const colonMatch = line.match(/^([^:]+):(.*)$/);
            if (colonMatch) {
              return { title: colonMatch[1].trim(), desc: colonMatch[2].trim() || line };
            }
            
            const periodMatch = line.match(/^([^.]+)\.(.*)$/);
            if (periodMatch && periodMatch[1].length < 40) {
              return { title: periodMatch[1].trim(), desc: periodMatch[2].trim() || line };
            }
            
            const words = line.split(' ');
            const title = words.length > 3 ? words.slice(0, 2).join(' ') : `Painopiste ${i + 1}`;
            return { title, desc: line };
          });
          
          setFocusAreas(parsedAreas.length > 0 ? parsedAreas : getDefaultFocusAreas());
        } else {
          setFocusAreas(getDefaultFocusAreas());
        }
      } else {
        setFocusAreas(getDefaultFocusAreas());
      }
    };

    loadData();
  }, [user]);

  const getDefaultFocusAreas = () => [
    { title: 'Ei määritelty', desc: 'Täydennä strategian "Miten"-osiota nähdäksesi painopisteet tässä.' }
  ];

  const strategyPhases = [
    { id: 'STRATEGIA', label: 'STRATEGIA', icon: Shield, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'BUSINESS_MODEL', label: 'LIIKETOIMINTAMALLI', icon: Layout, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'CONTRIBUTION', label: 'PROJEKTINI', icon: Target, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'YMPÄRISTÖ', label: 'TOIMINTAYMPÄRISTÖ', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6 md:space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">Strategia Etusivu</h1>
          <p className="text-slate-400 font-medium text-sm md:text-base">Ohjaa yrityksesi kasvua dynaamisen strategiatyökalun avulla.</p>
        </div>
        <div className="bg-white px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-black/5 shadow-sm flex items-center gap-3 w-fit">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Strateginen tila: Aktiivinen</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {strategyPhases.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNavigate(phase.id)}
            className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 ${phase.color} rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform`}>
              <phase.icon size={24} />
            </div>
            <h3 className="text-xs md:text-sm font-black tracking-widest uppercase mb-2">{phase.label}</h3>
            <div className="flex items-center justify-between mt-6 md:mt-8">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Päivitetty tänään</span>
              <ArrowRight className="text-emerald-500" size={16} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-xl">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">STRATEGISET PAINOPISTEALUEET</h2>
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
                <h4 className="font-black text-xs uppercase tracking-widest mb-2 line-clamp-1">{item.title}</h4>
                <p className="text-sm text-slate-500 font-medium line-clamp-3">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-900 p-6 md:p-10 rounded-[24px] md:rounded-[40px] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 md:mb-6">
              <Target className="text-emerald-400" size={20} />
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase mb-4">AI-Strategi</h2>
            <p className="text-emerald-100/60 text-sm leading-relaxed mb-8">
              Sparraa strategiaasi LLM-mallin avulla. Saat oivalluksia markkinadatasta ja menestysresepteistä.
            </p>
            <button 
              onClick={() => {
                // Dispatch a custom event to open the chat drawer
                window.dispatchEvent(new CustomEvent('open-ai-chat'));
              }}
              className="w-full bg-white text-emerald-900 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95"
            >
              Aloita sparraus
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
};
