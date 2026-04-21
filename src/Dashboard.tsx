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
      {/* HEADER: TERVETULOA JA LOGIIKKA */}
      <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Info size={20} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
              {portalType === PortalType.LTS ? 'Liiketoimintasuunnitelma' : 'Strategiaprosessi'}
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed italic text-sm md:text-base">
              Tervetuloa, {user?.displayName || 'Käyttäjä'}. Strategia on reagointiresepti, joka alkaa analyysillä[cite: 96, 279]. Järjestelmä siirtää ympäristön löydökset automaattisesti diagnoosin pohjaksi[cite: 101, 284].
            </p>
          </div>
        </div>
      </div>

      {/* STRATEGIAN YDINPROSESSI (VAIHEET 1-3) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Strategian muodostaminen</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. YRITYS / PERUSTEET */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => onNavigate(portalType === PortalType.LTS ? 'PERUSTEET' : 'YRITYS')}
            className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm hover:border-blue-500 transition-all cursor-pointer group"
          >
            <Briefcase className="text-blue-500 mb-4" size={32} />
            <h3 className="text-lg font-black uppercase tracking-tight">1. {portalType === PortalType.LTS ? 'PERUSTEET' : 'YRITYS'}</h3>
            <p className="text-slate-500 text-xs mt-3 font-medium leading-relaxed">
              Määrittele yrityksesi toiminta, osaaminen ja nykytilanne[cite: 2, 180]. Tämä luo pohjan koko suunnittelulle[cite: 189].
            </p>
            <div className="mt-6 flex items-center text-blue-600 text-[10px] font-bold uppercase tracking-widest">
              Täytä perustiedot <ArrowRight size={14} className="ml-2" />
            </div>
          </motion.div>

          {/* 2. TOIMINTAYMPÄRISTÖ */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => onNavigate('YMPÄRISTÖ')}
            className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm hover:border-blue-500 transition-all cursor-pointer group"
          >
            <Globe className="text-blue-500 mb-4" size={32} />
            <h3 className="text-lg font-black uppercase tracking-tight">2. TOIMINTAYMPÄRISTÖ</h3>
            <p className="text-slate-500 text-xs mt-3 font-medium leading-relaxed">
              Tunnista markkinan ja sisäisen toiminnan tärkeimmät positiiviset ja negatiiviset ilmiöt[cite: 16, 205]. Nämä löydökset siirtyvät automaattisesti strategian diagnoosiin[cite: 101, 284]. Seuraavassa vaiheessa kehität Miten-kohdat, eli kyvykkyydet, jolla reagoit ulkoisen- ja sisäisen ympäristön löydöksiin[cite: 104, 287].
            </p>
            <div className="mt-6 flex items-center text-blue-600 text-[10px] font-bold uppercase tracking-widest">
              Tee analyysi <ArrowRight size={14} className="ml-2" />
            </div>
          </motion.div>

          {/* 3. STRATEGIA */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => onNavigate('STRATEGIA')}
            className="bg-blue-600 p-8 rounded-[40px] text-white shadow-xl hover:bg-blue-700 transition-all cursor-pointer group"
          >
            <Shield className="text-blue-200 mb-4" size={32} />
            <h3 className="text-lg font-black uppercase tracking-tight">3. STRATEGIA</h3>
            <p className="text-blue-50 text-xs mt-3 font-medium leading-relaxed">
              Luo aikaan sidottu ja saavutettavissa oleva tavoite eli Visio[cite: 97, 280]. Diagnoosi tiivistää analyysin löydökset automaattisesti, ja Miten-kohta on vastaus diagnoosiin[cite: 101, 104, 284]. Tässä perustelet maksimissaan kuusi Miten-kohtaa eli kyvykkyyttä, joilla erilaistut ja erotut perustellusti kilpailijoista[cite: 107, 290].
            </p>
            <div className="mt-6 flex items-center text-white text-[10px] font-bold uppercase tracking-widest">
              Muodosta strategia <ArrowRight size={14} className="ml-2" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* TAKTIIKKA JA JALKAUTUS (VAIHEET 4-5) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Taktiikka ja jalkautus</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 4. LIIKETOIMINTAMALLI */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => onNavigate(portalType === PortalType.LTS ? 'OSASUUNNITELMAT' : 'BUSINESS_MODEL')}
            className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm hover:bg-slate-50 transition-all cursor-pointer group"
          >
            <Target className="text-slate-400 mb-4 group-hover:text-blue-500 transition-colors" size={32} />
            <h3 className="text-lg font-black uppercase tracking-tight">4. LIIKETOIMINTAMALLI</h3>
            <p className="text-slate-500 text-xs mt-3 font-medium leading-relaxed">
              Määritä tarkemmin kohderyhmät[cite: 72, 115]. Palastele strategiset kyvykkyydet käytännön aktiviteeteiksi, resursseiksi, tuloiksi ja kustannuksiksi[cite: 114]. Liiketoimintamalli on taktiikkatason havainnollistus strategian toteutuksesta[cite: 113].
            </p>
          </motion.div>

          {/* 5. TOTEUTUS / PROJEKTINI */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => onNavigate(portalType === PortalType.LTS ? 'TOTEUTUS' : 'PROJEKTINI')}
            className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm hover:bg-slate-50 transition-all cursor-pointer group"
          >
            <Puzzle className="text-slate-400 mb-4 group-hover:text-blue-500 transition-colors" size={32} />
            <h3 className="text-lg font-black uppercase tracking-tight">5. {portalType === PortalType.LTS ? 'TOTEUTUS' : 'PROJEKTINI'}</h3>
            <p className="text-slate-500 text-xs mt-3 font-medium leading-relaxed">
              Vie strategia ja liiketoimintamalli käytäntöön[cite: 157, 320]. Toteuta projekti, jonka pystyt perustelemaan niin, että se toteuttaa sekä joitakin Miten-kohtia että liiketoimintamallin tärkeimpiä aktiviteetteja ja resursseja[cite: 158].
            </p>
          </motion.div>

          {/* AI-SPARRAUS */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
            className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl hover:bg-slate-800 transition-all cursor-pointer group"
          >
            <Zap className="text-blue-400 mb-4" size={32} />
            <h4 className="text-lg font-black uppercase tracking-tight">AI-STRATEGI</h4>
            <p className="text-slate-400 text-xs mt-3 font-medium leading-relaxed">
              Haasta strategiasi ydin asiantuntevan tekoälyn avulla.
            </p>
            <div className="mt-6 flex items-center text-white text-[10px] font-bold uppercase tracking-widest">
              Avaa chatti <ArrowRight size={14} className="ml-2" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
