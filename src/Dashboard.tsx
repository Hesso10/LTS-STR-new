import React from 'react';
import { motion } from 'motion/react';
import { Globe, Shield, Zap, ArrowRight, Puzzle, Target, Info, Briefcase } from 'lucide-react';
import { PortalType, UserAccount } from './types';

interface DashboardProps {
  portalType: PortalType;
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ portalType, onNavigate, user }) => {
  const isLTS = portalType === PortalType.LTS;

  // LTS-PORTAALIN KORTIT (Liiketoimintasuunnitelma)
  const ltsPhases = [
    {
      id: 'PERUSTEET',
      label: '1. PERUSTEET',
      desc: 'Määrittele yrityksesi toiminta, osaaminen ja nykytilanne. Tämä luo pohjan koko suunnittelulle.',
      icon: Briefcase
    },
    {
      id: 'YMPÄRISTÖ',
      label: '2. TOIMINTAYMPÄRISTÖ',
      desc: 'Tunnista markkinan ja sisäisen toiminnan tärkeimmät positiiviset ja negatiiviset ilmiöt. Nämä löydökset siirtyvät automaattisesti strategian diagnoosiin. Seuraavassa vaiheessa kehität Miten-kohdat, eli kyvykkyydet, jolla reagoit ulkoisen- ja sisäisen ympäristön löydöksiin.',
      icon: Globe
    },
    {
      id: 'STRATEGIA',
      label: '3. STRATEGIA',
      desc: 'Luo aikaan sidottu ja saavutettavissa oleva tavoite eli Visio. Diagnoosi tiivistää analyysin löydökset automaattisesti, ja Miten-kohta on vastaus diagnoosiin. Tässä perustelet maksimissaan kuusi Miten-kohtaa eli kyvykkyyttä, joilla erilaistut ja erotut perustellusti kilpailijoista.',
      icon: Shield
    },
    {
      id: 'OSASUUNNITELMAT',
      label: '4. OSASUUNNITELMAT',
      desc: 'Toteuta Miten-kohta Markkinoinnin & myynnin, hallinnon, laskelmien sekä henkilöstön osalta. Älä listaa vain "jotain -kohtia", vaan tee laatimaasi strategiaa loogisesti toteuttavat selkeät osasuunnitelmat.',
      icon: Target
    },
    {
      id: 'TOTEUTUS',
      label: '5. TOTEUTUS',
      desc: 'Tavoitteelista ja aikatauluta seuraavat askeleet liiketoimintasuunnitelmasi viemiseksi käytännön teoiksi. Listaa ne vaiheet, jotka pitää tehdä jotta laatimasi liiketoimintasuunnitelma ei jää vain suunnittelun tasolle.',
      icon: Puzzle
    }
  ];

  // STR-PORTAALIN KORTIT (Strategiaprosessi)
  const strPhases = [
    {
      id: 'YRITYS',
      label: '1. YRITYS',
      desc: 'Määrittele yrityksesi toiminta, osaaminen ja nykytilanne. Tämä luo pohjan koko suunnittelulle.',
      icon: Briefcase
    },
    {
      id: 'YMPÄRISTÖ',
      label: '2. TOIMINTAYMPÄRISTÖ',
      desc: 'Tunnista markkinan ja sisäisen toiminnan tärkeimmät positiiviset ja negatiiviset ilmiöt. Nämä löydökset siirtyvät automaattisesti strategian diagnoosiin. Seuraavassa vaiheessa kehität Miten-kohdat, eli kyvykkyydet, jolla reagoit ulkoisen- ja sisäisen ympäristön löydöksiin.',
      icon: Globe
    },
    {
      id: 'STRATEGIA',
      label: '3. STRATEGIA',
      desc: 'Luo aikaan sidottu ja saavutettavissa oleva tavoite eli Visio. Diagnoosi tiivistää analyysin löydökset automaattisesti, ja Miten-kohta on vastaus diagnoosiin. Tässä perustelet maksimissaan kuusi Miten-kohtaa eli kyvykkyyttä, joilla erilaistut ja erotut perustellusti kilpailijoista.',
      icon: Shield
    },
    {
      id: 'BUSINESS_MODEL',
      label: '4. LIIKETOIMINTAMALLI',
      desc: 'Määritä tarkemmin kohderyhmät. Palastele strategiset kyvykkyydet käytännön aktiviteeteiksi, resursseiksi, tuloiksi ja kustannuksiksi. Liiketoimintamalli on taktiikkatason havainnollistus strategian toteutuksesta.',
      icon: Target
    },
    {
      id: 'PROJEKTINI',
      label: '5. PROJEKTINI',
      desc: 'Vie strategia ja liiketoimintamalli käytäntöön. Toteuta projekti, jonka pystyt perustelemaan niin, että se toteuttaa sekä joitakin Miten-kohtia että liiketoimintamallin tärkeimpiä aktiviteetteja ja resursseja.',
      icon: Puzzle
    }
  ];

  const activePhases = isLTS ? ltsPhases : strPhases;

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
              {isLTS ? 'Liiketoimintasuunnitelma' : 'Strategiaprosessi'}
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed italic text-sm md:text-base">
              Tervetuloa, {user?.displayName || 'Käyttäjä'}. Strategia on reagointiresepti, joka alkaa analyysillä. Järjestelmä siirtää ympäristön löydökset automaattisesti diagnoosin pohjaksi.
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
          {activePhases.slice(0, 3).map((phase) => (
            <motion.div
              key={phase.id}
              whileHover={{ y: -5 }}
              onClick={() => onNavigate(phase.id)}
              className={`p-8 rounded-[40px] border border-black/5 shadow-sm hover:border-blue-500 transition-all cursor-pointer group ${phase.id === 'STRATEGIA' ? 'bg-blue-600 text-white shadow-xl hover:bg-blue-700 border-none' : 'bg-white'}`}
            >
              <phase.icon className={`mb-4 ${phase.id === 'STRATEGIA' ? 'text-blue-200' : 'text-blue-500'}`} size={32} />
              <h3 className="text-lg font-black uppercase tracking-tight">{phase.label}</h3>
              <p className={`text-xs mt-3 font-medium leading-relaxed ${phase.id === 'STRATEGIA' ? 'text-blue-50' : 'text-slate-500'}`}>
                {phase.desc}
              </p>
              <div className={`mt-6 flex items-center text-[10px] font-bold uppercase tracking-widest ${phase.id === 'STRATEGIA' ? 'text-white' : 'text-blue-600'}`}>
                Jatka tästä <ArrowRight size={14} className="ml-2" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TAKTIIKKA JA JALKAUTUS (VAIHEET 4-5 + AI) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Taktiikka ja jalkautus</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activePhases.slice(3).map((phase) => (
            <motion.div
              key={phase.id}
              whileHover={{ y: -5 }}
              onClick={() => onNavigate(phase.id)}
              className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm hover:border-blue-500 transition-all cursor-pointer group"
            >
              <phase.icon className="text-slate-400 mb-4 group-hover:text-blue-500 transition-colors" size={32} />
              <h3 className="text-lg font-black uppercase tracking-tight">{phase.label}</h3>
              <p className="text-slate-500 text-xs mt-3 font-medium leading-relaxed">
                {phase.desc}
              </p>
              <div className="mt-6 flex items-center text-blue-600 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Avaa osio <ArrowRight size={14} className="ml-2" />
              </div>
            </motion.div>
          ))}

          {/* AI-SPARRAUS KORTTI */}
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
            className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl hover:bg-slate-800 transition-all cursor-pointer group"
          >
            <Zap className="text-blue-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h4 className="text-lg font-black uppercase tracking-tight italic text-white">AI-STRATEGI</h4>
            <p className="text-slate-400 text-xs mt-3 font-medium leading-relaxed">
              Haasta strategiasi ydin ja sparraile diagnoosia asiantuntevan tekoälyn avulla.
            </p>
            <div className="mt-6 flex items-center text-white text-[10px] font-bold uppercase tracking-widest">
              Aloita sparraus <ArrowRight size={14} className="ml-2" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
