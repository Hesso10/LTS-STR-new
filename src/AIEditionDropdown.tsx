import React, { useState } from 'react';
import { Sparkles, X, Check } from 'lucide-react';

interface AIEditionDropdownProps {
  fieldId: string;
  currentValue: string;
  onApply: (newValue: string) => void;
  portalType: 'LTS' | 'STR';
}

export const AIEditionDropdown: React.FC<AIEditionDropdownProps> = ({ 
  fieldId, 
  onApply 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // DUMMYDATA TESTAUKSEEN
  const dummyData: Record<string, string> = {
    "miten_1": "Hyödynnetään automatisoitua asiakashankintaprosessia ja 24/7 AI-pohjaista tukea.",
    "businessIdeaHow": "Tuotamme palvelun täysin digitaalisena SaaS-alustana, hyödyntäen Gemini-tekoälyä."
  };

  const suggestion = dummyData[fieldId] || "AI Edition: Optimointiehdotus ilmestyy tähän haaston jälkeen.";

  return (
    <div className="absolute top-2 right-2 z-20">
      <button
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-200 shadow-sm"
      >
        <Sparkles size={12} className={isOpen ? "animate-pulse" : ""} />
        {isOpen ? 'Sulje' : 'AI Edition'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 md:w-96 bg-white border border-indigo-100 rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3 text-slate-900">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Ehdotus</span>
            <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-500">
              <X size={16} />
            </button>
          </div>
          
          <div className="bg-indigo-50/50 p-4 rounded-xl mb-4 border border-indigo-50 text-slate-700">
            <p className="text-sm leading-relaxed italic font-medium">
              "{suggestion}"
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                onApply(suggestion);
                setIsOpen(false);
              }}
              className="flex-1 bg-indigo-600 text-white text-[10px] font-black uppercase py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <Check size={14} /> Ota käyttöön
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
