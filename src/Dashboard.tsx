import React from 'react';
import { motion } from 'motion/react';
import { Globe, Shield, Zap, ArrowRight, Puzzle, Target, Info, RefreshCw, Briefcase, ListChecks } from 'lucide-react';
import { PortalType, UserAccount } from './types';

interface DashboardProps {
  portalType: PortalType;
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ portalType, onNavigate, user }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* HEADER: PROSESSIN KUVAUS JA LOGIIKKA */}
      <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Info size={20} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
              {portalType === PortalType.LTS ? 'Liiketoimintasuunnitelma' : 'Strategiaprosessi'}
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed italic">
              Tervetuloa, {user?.displayName || 'Käyttäjä'}. Strategia on reagointiresepti, joka alkaa analyysillä[cite: 96, 279]. Järjestelmä siirtää ympäristön löydökset automaattisesti diagnoosin pohjaksi[cite: 101, 284].
            </p>
          </div>
        </div>
      </div>

      {/* STRATEGIAN YDIN: ANALYYSI JA STRATEGIA-KOKONAISUUS */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Suunnittelun ydin</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          {/* VAIHE 1: TOIMINTAYMPÄRISTÖ (ANALYYSI) */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => onNavigate('YMPÄRISTÖ')}
            className="bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-sm hover:border-blue-500 transition-all cursor-pointer group relative z-10"
          >
            <Globe className="text-blue-500 mb-6" size={48} />
            <h3 className="text-2xl font-black uppercase tracking-tight italic">1. TOIMINTAYMPÄRISTÖ</h3>
            <p className="text-slate-500 text-sm mt-4 font-medium leading-relaxed">
              **Analyysivaihe:** Tunnista markkinan ja sisäisen toiminnan ilmiöt[cite: 16, 75, 205, 259]. Nämä löydökset ovat raaka-ainetta, jotka siirtyvät automaattisesti strategian diagnoosiin[cite: 101, 284].
            </p>
            <div className="mt-8 flex items-center text-blue-600 text-xs font-bold uppercase tracking-widest">
              Aloita analyysi <ArrowRight size={16} className="ml-2" />
            </div>
          </motion.div>

          {/* VAIHE 2: STRATEGIA (VISIO, ARVOT, DIAGNOOSI, MITEN) */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => onNavigate('STRATEGIA')}
            className="bg-blue-600 p-10 rounded-[40px] text-white shadow-xl hover:bg-blue-700 transition-all cursor-pointer group relative z-10"
          >
            <Shield className="text-blue-200 mb-6" size={48} />
            <h3 className="text-2xl font-black uppercase tracking-tight italic">2. STRATEGIA</h3>
            <div className="space-y-4 mt-4">
              <p className="text-blue-100 text-sm font-medium leading-relaxed">
                Tämä on kokonaisuus, jolla saavutat tavoitteesi[cite: 96, 279]:
              </p>
              <ul className="grid grid-cols-2 gap-3">
                <li className="bg-blue-500/50 p-3 rounded-2xl border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <Target size={14} /> Visio
                </li>
                <li className="bg-blue-500/50 p-3 rounded-2xl border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <ListChecks size={14} /> Arvot
                </li>
                <li className="bg-blue-500/50 p-3 rounded-2xl border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-amber-200">
                  <RefreshCw size={14} /> Diagnoosi
                </li>
                <li className="bg-emerald-500/50 p-3 rounded-2xl border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-100">
                  <Zap size={14} /> Miten
                </li>
              </ul>
              <p className="text-blue-100 text-[10px] italic pt-2">
                * Miten-kohta on vastaus diagnoosiin[cite: 104, 287].
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* RAAMIT JA TOTEUTUSVAIHEET */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Raamit ja jalkautus</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* PERUSTEET / YRITYS */}
          <div 
            onClick={() => onNavigate(portalType === PortalType.LTS ? 'PERUSTEET' : 'YRITYS')}
            className="bg-white p-6 rounded-[32px] border border-black/5 hover:bg-slate-50 transition-all cursor-pointer flex flex-col gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white transition-colors">
              <Briefcase size={20} />
            </div>
            <h4 className="font-black uppercase text-xs tracking-tight">
              {portalType === PortalType.LTS ? 'PERUSTEET' : 'YRITYS'}
            </h4>
            <p className="text-slate-400 text-[10px] font-medium leading-tight italic">Liikeidea ja tausta[cite: 1, 159].</p>
          </div>

          {/* OSASUUNNITELMAT / LIIKETOIMINTAMALLI */}
          <div 
            onClick={() => onNavigate(portalType === PortalType.LTS ? 'OSASUUNNITELMAT' : 'BUSINESS_MODEL')}
            className="bg-white p-6 rounded-[32px] border border-black/5 hover:bg-slate-50 transition-all cursor-pointer flex flex-col gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white transition-colors">
              <Target size={20} />
            </div>
            <h4 className="font-black uppercase text-xs tracking-tight">
              {portalType === PortalType.LTS ? 'OSASUUNNITELMAT' : 'LIIKETOIMINTAMALLI'}
            </h4>
            <p className="text-slate-400 text-[10px] font-medium leading-tight italic">Viedään kyvykkyydet käytäntöön[cite: 112, 113, 169].</p>
          </div>

          {/* TOTEUTUS / PROJEKTIT */}
          <div 
            onClick={() => onNavigate(portalType === PortalType.LTS ? 'TOTEUTUS' : 'PROJEKTINI')}
            className="bg-white p-6 rounded-[32px] border border-black/5 hover:bg-slate-50 transition-all cursor-pointer flex flex-col gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white transition-colors">
              <Puzzle size={20} />
            </div>
            <h4 className="font-black uppercase text-xs tracking-tight">
              {portalType === PortalType.LTS ? 'TOTEUTUS' : 'PROJEKTINI'}
            </h4>
            <p className="text-slate-400 text-[10px] font-medium leading-tight italic">Aikataulutettu jalkautus[cite: 157, 320].</p>
          </div>

          {/* AI-SPARRAUS */}
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
            className="bg-slate-900 p-6 rounded-[32px] text-white hover:bg-slate-800 transition-all cursor-pointer flex flex-col gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
              <Zap size={20} />
            </div>
            <h4 className="font-black uppercase text-xs tracking-tight tracking-widest italic">AI-SPARRAUS</h4>
            <p className="text-slate-400 text-[10px] font-medium leading-tight">Haasta strategiasi ydin.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
