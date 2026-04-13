import React from 'react';
import { motion } from 'motion/react';
import { PortalType } from './types';
import { Layout, Shield, ArrowRight } from 'lucide-react';

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
        {/* UPPER RIGHT TAB REMOVED */}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-4xl w-full text-center mt-8 md:mt-0 mb-12 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 md:mb-6 uppercase">Suunnittele liiketoimintasi</h1>
          <p className="text-base md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Raamita liiketoimintaasi hyvin toimivan liiketoiminnansuunnittelutyökalun avulla. Tukenasi on relevantilla datalla sparrattu AI LLM-malli. Saat apua luotettavan tilastodatan ja hyvin toimineiden liiketoimintahankkeiden esimerkkien avulla. Pystyt pienessä ajassa tekemään liiketoimintasuunnitelman tai strategian.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-5xl mb-8">
          {/* LTS Card */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-xl border border-black/5 flex flex-col h-full">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">LTS</h2>
            <p className="text-sm md:text-base text-slate-500 mb-6 flex-1">
              Liiketoimintasuunnitelman rakennusalusta. Tee hyvä liiketoimintasuunnitelma hyödyntämällä markkinadataa, interaktiivista laskuria ja konkariyrittäjien neuvoja.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => onLogin(PortalType.LTS)}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
              >
                Luo tunnus / Kirjaudu sisään
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>

          {/* STRATEGIA Card */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-xl border border-black/5 flex flex-col h-full">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">STRATEGIA</h2>
            <p className="text-sm md:text-base text-slate-500 mb-6 flex-1">
              Strategian tekemisen alusta. Vie liiketoimintasi seuraavalle tasolle markkinadataa hyödyntävän dynaamisen strategiatyökalun avulla.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => onLogin(PortalType.STRATEGY)}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
              >
                Luo tunnus / Kirjaudu sisään
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
