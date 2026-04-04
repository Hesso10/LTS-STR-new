import React, { useState, useEffect } from 'react';
import { Bot, X, Sparkles, ShieldCheck } from 'lucide-react';
import { PortalType, SystemKnowledge, UserAccount } from '../types';

interface AIChatProps {
  portalType: PortalType;
  onClose?: () => void;
  activeSection?: string;
  isMobile?: boolean;
  systemKnowledge: SystemKnowledge;
  user: UserAccount | null;
}

export const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the access token from your backend as soon as the component loads
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/vertex-token');
        const data = await response.json();
        
        if (data.token) {
          setAuthToken(data.token);
          
          // Inject token directly into the DOM element
          const widget = document.querySelector('gen-search-widget') as any;
          if (widget) {
            widget.authToken = data.token;
          }
        }
      } catch (err) {
        console.error("Failed to authenticate AI Widget:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  const handleOpenWidget = () => {
    const trigger = document.getElementById('searchWidgetTrigger');
    if (trigger) {
      trigger.click();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className={authToken ? "text-green-400" : "text-blue-400"} size={24} />
          <span className="font-bold">Hessonpaja Professional AI</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/30">
            <Sparkles size={48} className={authToken ? "text-blue-400" : "text-slate-600"} />
          </div>
          {authToken && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-slate-900">
              <ShieldCheck size={16} className="text-white" />
            </div>
          )}
        </div>

        <div className="max-w-xs">
          <h3 className="text-xl font-bold mb-2">Tekoälyavustaja valmiina</h3>
          <p className="text-slate-400 text-sm">
            Olen yhdistetty yrityksesi strategioihin ja tietokantoihin. Voit kysyä mistä tahansa sisäisestä dokumentista.
          </p>
        </div>

        <button
          onClick={handleOpenWidget}
          disabled={!authToken || loading}
          className={`
            group relative flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all
            ${authToken 
              ? "bg-blue-600 hover:bg-blue-500 text-white scale-100 hover:scale-105 shadow-lg shadow-blue-900/20" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed"}
          `}
        >
          {loading ? "Varmistetaan yhteyttä..." : "Aloita haku ja chatti"}
        </button>

        {!authToken && !loading && (
          <p className="text-red-400 text-xs mt-4">
            Kirjautumisvirhe. Varmista, että olet kirjautunut sisään.
          </p>
        )}
      </div>

      {/* Footer info */}
      <div className="p-4 text-center border-t border-slate-800/50">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
          Powered by Vertex AI Agent Builder
        </p>
      </div>
    </div>
  );
};
