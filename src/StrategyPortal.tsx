import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Shield, 
  Layout, 
  Briefcase, 
  ArrowRight,
  Puzzle,
  Info,
  Zap,
  Globe,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { UserAccount } from './types';

interface StrategyPortalProps {
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
  viewingWorkspaceAs?: string | null;
}

export const StrategyPortal: React.FC<StrategyPortalProps> = ({ onNavigate, user }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const strategyPhases = [
    { 
      id: 'YRITYS', 
      label: '1. YRITYS', 
      shortDesc: 'Määrittele yrityksesi toiminta ja nykytilanne.',
      longDesc: 'Kerro omin sanoin yrityksestäsi. Määrittele organisaatiomalli ja voit hahmotella eri osastojen ja roolien välisiä suhteita.',
      aiExamples: [
        'Kerro linjaorganisaation, matriisiorganisaation sekä projektiorganisaation tunnuspiirteet.'
      ],
      icon: Briefcase 
    },
    { 
      id: 'YMPÄRISTÖ', 
      label: '2. TOIMINTAYMPÄRISTÖ', 
      shortDesc: 'Tunnista markkinan ja sisäisen toiminnan ilmiöt.',
      longDesc: 'Tunnista markkinan ja sisäisen toiminnan tärkeimmät ilmiöt. Nämä löydökset siirtyvät automaattisesti strategian diagnoosiin. Laatiessasi toimintaympäristön analyysiä keskity vain niihin ilmiöihin, jotka ovat positiivisesti tai negatiivisesti relevantteja yrityksesi tulevalle strategialle.',
      aiExamples: [
        'A.) Havainnollista ajankohtaisella esimerkillä PESTEL ja asiakas- sekä kilpailija-analyysi.',
        'B.) Miten tehdään pienen yrityksen sisäisen toimintaympäristön analyysi?'
      ],
      icon: Globe 
    },
    { 
      id: 'STRATEGIA', 
      label: '3. STRATEGIA', 
      shortDesc: 'Luo visio ja määritä erottuvat kyvykkyydet.',
      longDesc: 'Luo Visio ja määritä arvot. Diagnoosi-kohta syntyy automaattisesti toimintaympäristöanalyysin löydöksistä. "Miten"-kohta tarkoittaa kyvykkyyksiä. On kriittistä, että valitsemillasi kohdilla todella reagoidaan diagnoosissa esiin nousseisiin haasteisiin. Nämä kyvykkyydet erilaistavat sinut kilpailijoista.',
      aiExamples: [
        'A.) Miten kyvykkyydet ja diagnoosin havainnot liittyvät toisiinsa R.Rumeltin logiikalla havainnollistettuna.',
        'B.) Anna esimerkki miten-kohdasta eli kyvykkyydestä perinteisessä kivijalkalääkäriyrityksessä, jossa haasteena on digitalisoituva asiointi.'
      ],
      icon: Shield 
    },
    { 
      id: 'BUSINESS_MODEL', 
      label: '4. LIIKETOIMINTAMALLI', 
      shortDesc: 'Muuta strategiset kyvykkyydet taktiikan tasolle.',
      longDesc: 'Määritä kohderyhmät ja palastele kyvykkyydet käytännön aktiviteeteiksi, resursseiksi ja tuloiksi. Tärkeää on huomioida, että liiketoimintamalli on periaatteiltaan "kopio" strategian Miten-kohdista – se vie strategian taktiikan ja suorituksen tasolle.',
      aiExamples: [
        'Selitä Business Model Canvaksen kaikki kohdat pois lukien yhteistyökumppanit.'
      ],
      icon: Layout 
    },
    { 
      id: 'PROJEKTINI', 
      label: '5. PROJEKTINI', 
      shortDesc: 'Toteuta strategian ja liiketoimintamallin vaatimat projektit.',
      longDesc: 'Toteuta projekti, joka toteuttaa sekä Miten-kohtia että liiketoimintamallin tärkeimpiä resursseja. Tässä vaiheessa suunnitelma muuttuu konkreettisiksi aikataulutetuiksi tehtäviksi.',
      aiExamples: [
        'Miten projektinhallinnan parhaat käytännöt auttavat strategian jalkautuksessa?'
      ],
      icon: Puzzle 
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
      {/* HEADER */}
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {strategyPhases.map((phase, index) => {
            const isExpanded = expandedId === phase.id;
            const isMainStrategy = phase.id === 'STRATEGIA';

            return (
              <motion.div
                layout
                key={phase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setExpandedId(isExpanded ? null : phase.id)}
                className={`
                  p-6 rounded-[28px] border border-black/5 shadow-sm transition-all cursor-pointer relative overflow-hidden
                  ${isMainStrategy ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50'}
                  ${isExpanded ? 'md:col-span-2 shadow-xl ring-2 ring-emerald-500/10' : 'col-span-1'}
                `}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                    ${isMainStrategy ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
                    <phase.icon size={20} />
                  </div>
                  <h3 className="text-[11px] font-black tracking-widest uppercase leading-none">
                    {phase.label}
                  </h3>
                </div>

                {!isExpanded && (
                  <p className={`text-[10px] leading-snug font-medium mb-4 ${isMainStrategy ? 'text-emerald-50/80' : 'text-slate-400'}`}>
                    {phase.shortDesc}
                  </p>
                )}

                <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter mb-2 
                  ${isMainStrategy ? 'text-emerald-200' : 'text-emerald-600'}`}>
                  {isExpanded ? 'Sulje tiedot' : 'Lue lisää'}
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                    <ChevronDown size={14} />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`text-xs leading-relaxed space-y-4 pt-2 pb-4 ${isMainStrategy ? 'text-emerald-50' : 'text-slate-600'}`}>
                        <p className="font-medium">{phase.longDesc}</p>
                        
                        <div className={`p-4 rounded-2xl border ${isMainStrategy ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-black/5'}`}>
                          <div className="flex items-center gap-2 mb-3 opacity-80 text-[10px] font-black uppercase">
                            <Sparkles size={12} />
                            AI-Chat Esimerkit:
                          </div>
                          <div className="space-y-3">
                            {phase.aiExamples.map((example, i) => (
                              <p key={i} className="italic text-[11px] leading-relaxed border-l-2 border-emerald-500/20 pl-3">
                                "{example}"
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(phase.id);
                        }}
                        className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-transform active:scale-95
                          ${isMainStrategy ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'}
                        `}
                      >
                        Avaa osio <ArrowRight size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isExpanded && (
                  <div className="mt-4 flex items-center justify-between pt-2">
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${isMainStrategy ? 'text-emerald-200' : 'text-slate-300'}`}>Päivitetty</span>
                    <ArrowRight size={14} className={isMainStrategy ? 'text-white' : 'text-emerald-500'} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ALAKERRAN AI-KORTTI */}
      <div className="flex justify-center">
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
          className="w-full max-w-4xl bg-emerald-950 p-8 md:p-12 rounded-[40px] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8 cursor-pointer"
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
