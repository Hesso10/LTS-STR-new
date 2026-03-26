import React from 'react';
import { motion } from 'motion/react';
import { Layout, FileText, Globe, Shield, Layers, Download, CheckCircle2, Clock, Plus, ArrowRight } from 'lucide-react';
import { PortalType, PlanSection, UserAccount } from '../types';

interface DashboardProps {
  portalType: PortalType;
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ portalType, onNavigate, user }) => {
  const phases = portalType === PortalType.LTS ? [
    { id: 'PERUSTEET', label: 'PERUSTEET', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { id: 'YMPÄRISTÖ', label: 'TOIMINTAYMPÄRISTÖ', icon: Globe, color: 'bg-blue-50 text-blue-600' },
    { id: 'STRATEGIA', label: 'STRATEGIA', icon: Shield, color: 'bg-blue-50 text-blue-600' },
    { id: 'OSASUUNNITELMAT', label: 'OSASUUNNITELMAT', icon: Layers, color: 'bg-blue-50 text-blue-600' },
  ] : [
    { id: 'YRITYS', label: 'YRITYS', icon: FileText, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'YMPÄRISTÖ', label: 'TOIMINTAYMPÄRISTÖ', icon: Globe, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'STRATEGIA', label: 'STRATEGIA', icon: Shield, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'BUSINESS_MODEL', label: 'LIIKETOIMINTAMALLI', icon: Layout, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">
            {portalType === PortalType.LTS ? 'LTS Yleisnäkymä' : 'Strategia Etusivu'}
          </h1>
          <p className="text-slate-400 font-medium">Tervetuloa takaisin, {user?.displayName || 'Käyttäjä'}.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-black/5 shadow-sm flex items-center gap-3 w-fit">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Status: Aktiivinen</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {phases.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNavigate(phase.id)}
            className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 ${phase.color} rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform`}>
              <phase.icon size={24} className="md:w-7 md:h-7" />
            </div>
            <h3 className="text-xs md:text-sm font-black tracking-widest uppercase mb-2">{phase.label}</h3>
            <div className="flex items-center justify-between mt-6 md:mt-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white bg-slate-100" />
                ))}
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-slate-300 uppercase tracking-widest">0% Valmis</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-black/5 shadow-xl">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Viimeisimmät toiminnot</h2>
            <button className="text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Näytä kaikki</button>
          </div>
          <div className="space-y-4 md:space-y-6">
            {[
              { action: 'Päivitti liikeidean', time: '2 tuntia sitten', icon: CheckCircle2, color: 'text-emerald-500' },
              { action: 'Lisäsi uuden tiedoston', time: '5 tuntia sitten', icon: Plus, color: 'text-blue-500' },
              { action: 'Muokkasi strategiaa', time: 'Eilen', icon: Clock, color: 'text-amber-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-50 flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-bold">{item.action}</p>
                  <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.time}</p>
                </div>
                <ArrowRight className="text-slate-200 w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-6 md:p-10 rounded-[32px] md:rounded-[40px] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 md:mb-6">
              <Shield className="text-blue-400 w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase mb-3 md:mb-4">AI-Tuki</h2>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6 md:mb-8">
              Saat vastauksia ja oivalluksia suunnitelmasi kehittämiseen asiantuntijanauhoitusten sekä hyödyllisten datalähteiden avulla.
            </p>
            <button 
              onClick={() => {
                // Dispatch a custom event to open the chat drawer
                window.dispatchEvent(new CustomEvent('open-ai-chat'));
              }}
              className="w-full bg-white text-black py-3 md:py-4 rounded-2xl font-bold text-xs md:text-sm uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
            >
              Avaa AI-Tuki
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
};

