import React from 'react';
import { motion } from 'motion/react';
import { Layout, FileText, Globe, Shield, Layers, Download, CheckCircle2, Clock, Plus, ArrowRight } from 'lucide-react';
import { PortalType, PlanSection, UserAccount } from './types';

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
          </motion.div
