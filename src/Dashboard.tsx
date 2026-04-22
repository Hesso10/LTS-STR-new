import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Shield, 
  Zap, 
  ArrowRight, 
  Puzzle, 
  Target, 
  Info, 
  Briefcase, 
  ChevronDown, 
  Sparkles 
} from 'lucide-react';
import { PortalType, UserAccount } from './types';

interface DashboardProps {
  portalType: PortalType;
  onNavigate: (section: string) => void;
  user?: UserAccount | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ portalType, onNavigate, user }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isSTR = portalType === PortalType.STR;
  const accentBase = isSTR ? 'emerald' : 'blue';

  const content = {
    [PortalType.LTS]: {
      title: 'Liiketoimintasuunnitelma',
      phases: [
        { 
          id: 'PERUSTEET', 
          label: '1. PERUSTEET', 
          desc: 'Määrittele yrityksesi toiminta, osaaminen ja nykytilanne. Tämä luo pohjan koko suunnittelulle.',
          longDesc: 'Määrittele yrityksesi toiminta, osaaminen ja nykytilanne. Tämä luo pohjan koko suunnittelulle.',
          aiExamples: [
            'A.) Miten toiminimi, osakeyhtiö, avoin yhtiö ja kommandiittiyhtiö eroavat toisistaan?',
            'B.) Millainen on hyvä liikeidea?'
          ],
          icon: Briefcase 
        },
        { 
          id: 'YMPÄRISTÖ', 
          label: '2. TOIMINTAYMPÄRISTÖ', 
          desc: 'Tunnista markkinan ja sisäisen toiminnan tärkeimmät ilmiöt.',
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
          desc: 'Luo Visio ja määritä erottuvat kyvykkyydet eli "Miten"-kohdat.',
          longDesc: 'Luo Visio ja määritä arvot. Diagnoosi-kohta syntyy automaattisesti toimintaympäristöanalyysin löydöksistä. "Miten"-kohta tarkoittaa kyvykkyyksiä. On kriittistä, että valitsemillasi kohdilla todella reagoidaan diagnoosissa esiin nousseisiin haasteisiin. Nämä kyvykkyydet erilaistavat sinut kilpailijoista.',
          aiExamples: [
            'A.) Miten kyvykkyydet ja diagnoosin havainnot liittyvät toisiinsa R.Rumeltin logiikalla havainnollistettuna.',
            'B.) Anna esimerkki miten-kohdasta eli kyvykkyydestä perinteisessä kivijalkalääkäriyrityksessä, jossa haasteena on digitalisoituva asiointi.'
          ],
          icon: Shield 
        },
        { 
          id: 'OSASUUNNITELMAT', 
          label: '4. OSASUUNNITELMAT', 
          desc: 'Toteuta Miten-kohta Markkinoinnin & myynnin, hallinnon, laskelmien sekä henkilöstön osalta.',
          longDesc: 'Toteuta Miten-kohta Markkinoinnin & myynnin, hallinnon, laskelmien sekä henkilöstön osalta. Älä listaa vain "jotain -kohtia", vaan tee laatimaasi strategiaa loogisesti toteuttavat selkeät osasuunnitelmat.',
          aiExamples: [
            'A.) Mikä on yhden 2000 €/kk palkansaajan todellinen kulu yritykselle?',
            'B.) Miten hakukoneoptimoin verkkosivun niin, että se löytyy hyvin paikallisilla hauilla orgaanisissa tuloksissa ja Googlen kartoissa?',
            'C.) Mistä saa rahoitusta investointeihin?'
          ],
          icon: Target 
        },
        { 
          id: 'TOTEUTUS', 
          label: '5. TOTEUTUS', 
          desc: 'Aikatauluta askeleet suunnitelman viemiseksi käytäntöön.',
          longDesc: 'Tavoitteelista ja aikatauluta seuraavat askeleet liiketoimintasuunnitelmasi viemiseksi käytännön teoiksi. Listaa ne vaiheet, jotka pitää tehdä jotta laatimasi liiketoimintasuunnitelma ei jää vain suunnittelun tasolle.',
          aiExamples: ['Luo 90 päivän toimintasuunnitelma uuden palvelun lanseeraukselle.'],
          icon: Puzzle 
        }
      ]
    },
    [PortalType.STR]: {
      title: 'Strategiaprosessi',
      phases: [
        { id: 'YRITYS', label: '1. YRITYS', desc: 'Määrittele yrityksesi toiminta, osaaminen ja nykytilanne. Tämä luo pohjan koko suunnittelulle.', icon: Briefcase },
        { id: 'YMPÄRISTÖ', label: '2. TOIMINTAYMPÄRISTÖ', desc: 'Tunnista markkinan ja sisäisen toiminnan tärkeimmät positiiviset ja negatiiviset ilmiöt. Nämä löydökset siirtyvät automaattisesti strategian diagnoosiin.', icon: Globe },
        { id: 'STRATEGIA', label: '3. STRATEGIA', desc: 'Luo aikaan sidottu ja saavutettavissa oleva tavoite eli Visio. Diagnoosi tiivistää analyysin löydökset automaattisesti, ja Miten-kohta on vastaus diagnoosiin.', icon: Shield },
        { id: 'BUSINESS_MODEL', label: '4. LIIKETOIMINTAMALLI', desc: 'Määritä tarkemmin kohderyhmät. Palastele strategiset kyvykkyydet käytännön aktiviteeteiksi, resursseiksi, tuloiksi ja kustannuksiksi.', icon: Target },
        { id: 'PROJEKTINI', label: '5. PROJEKTINI', desc: 'Vie strategia ja liiketoimintamalli käytäntöön. Toteuta projekti, jonka pystyt perustelemaan.', icon: Puzzle }
      ].map(p => ({ ...p, longDesc: p.desc, aiExamples: [] }))
    }
  };

  const currentPortalContent = content[portalType] || content[PortalType.LTS];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 p-4">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full bg-${accentBase}-100 flex items-center justify-center shrink-0 text-${accentBase}-600`}>
            <Info size={20} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
              {currentPortalContent.title}
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed italic text-sm md:text-base">
              Tervetuloa, {user?.displayName || 'Käyttäjä'}. Strategia on reagointiresepti, joka alkaa analyysillä. Järjestelmä siirtää ympäristön löydökset automaattisesti diagnoosin pohjaksi.
            </p>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        {currentPortalContent.phases.map((phase, index) => {
          const isExpanded = expandedId === phase.id;
          const isHighlight = phase.id === 'STRATEGIA';

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
                ${isHighlight ? `bg-${accentBase}-600 text-white` : 'bg-white hover:bg-slate-50'}
                ${isExpanded ? 'md:col-span-2 shadow-xl ring-2 ring-opacity-10' : 'col-span-1'}
                ${isExpanded && isHighlight ? `ring-${accentBase}-400` : ''}
              `}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                  ${isHighlight ? 'bg-white/20' : `bg-${accentBase}-50 text-${accentBase}-600`}`}>
                  <phase.icon size={20} />
                </div>
                <h3 className="text-[11px] font-black tracking-widest uppercase leading-none">
                  {phase.label}
                </h3>
              </div>

              {!isExpanded && (
                <p className={`text-[10px] leading-snug font-medium mb-4 ${isHighlight ? 'text-white/80' : 'text-slate-400'}`}>
                  {phase.desc}
                </p>
              )}

              <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-tighter mb-2 
                ${isHighlight ? 'text-white/60' : `text-${accentBase}-600`}`}>
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
                    <div className={`text-xs leading-relaxed space-y-4 pt-2 pb-4 ${isHighlight ? 'text-white/90' : 'text-slate-600'}`}>
                      <p className="font-medium">{phase.longDesc}</p>
                      
                      {phase.aiExamples.length > 0 && (
                        <div className={`p-4 rounded-2xl border ${isHighlight ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-black/5'}`}>
                          <div className="flex items-center gap-2 mb-3 opacity-80 text-[10px] font-black uppercase">
                            <Sparkles size={12} />
                            AI-Chat Esimerkki:
                          </div>
                          <div className="space-y-3">
                            {phase.aiExamples.map((example, i) => (
                              <p key={i} className="italic text-[11px] leading-relaxed border-l-2 border-current border-opacity-20 pl-3">
                                "{example}"
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(phase.id);
                      }}
                      className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-transform active:scale-95
                        ${isHighlight ? 'bg-white text-slate-900' : `bg-${accentBase}-600 text-white shadow-lg`}
                      `}
                    >
                      Avaa osio <ArrowRight size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isExpanded && (
                <div className="mt-4 flex items-center justify-between pt-2 border-t border-black/[0.03]">
                  <span className={`text-[8px] font-bold uppercase tracking-widest ${isHighlight ? 'text-white/40' : 'text-slate-300'}`}>Päivitetty</span>
                  <ArrowRight size={14} className={isHighlight ? 'text-white' : `text-${accentBase}-500`} />
                </div>
              )}
            </motion.div>
          );
        })}

        {/* AI CARD */}
        <motion.div
          whileHover={{ y: -5 }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}
          className="bg-slate-900 p-6 rounded-[28px] text-white shadow-xl cursor-pointer group flex flex-col justify-between min-h-[160px]"
        >
          <div>
            <Zap className={`text-${accentBase}-400 mb-4`} size={24} />
            <h4 className="text-[11px] font-black uppercase tracking-widest italic">AI-STRATEGI</h4>
            <p className="text-slate-400 text-[10px] mt-2 font-medium leading-relaxed">
              Haasta suunnitelmasi ja sparraile asiantuntevan tekoälyn kanssa.
            </p>
          </div>
          <div className="flex items-center text-white text-[9px] font-bold uppercase tracking-widest pt-4">
            Aloita sparraus <ArrowRight size={14} className="ml-2" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
