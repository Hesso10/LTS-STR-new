import React from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowRight, LogOut } from 'lucide-react';

interface VerificationScreenProps {
  email: string;
  onBackToLogin: () => void;
}

export const VerificationScreen: React.FC<VerificationScreenProps> = ({ email, onBackToLogin }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-[40px] shadow-2xl w-full max-w-md border border-black/5 text-center"
      >
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Mail size={40} />
        </div>
        
        <h2 className="text-3xl font-black tracking-tighter uppercase mb-4">Vahvista sähköposti</h2>
        <p className="text-slate-500 font-medium leading-relaxed mb-10">
          Olemme lähettäneet vahvistussähköpostin osoitteeseen <br />
          <span className="text-black font-bold">{email}</span>. <br />
          Ole hyvä ja vahvista se, niin voit kirjautua sisään.
        </p>

        <div className="space-y-4">
          <button 
            onClick={onBackToLogin}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
          >
            <span>Palaa kirjautumiseen</span>
            <ArrowRight size={20} />
          </button>
          
          <button 
            onClick={onBackToLogin}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-black transition-colors font-bold text-xs uppercase tracking-widest"
          >
            <LogOut size={14} />
            Kirjaudu ulos
          </button>
        </div>
      </motion.div>
    </div>
  );
};
