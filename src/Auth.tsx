// ... (imports and logic remain 100% identical to your original)

export const Auth: React.FC<AuthProps> = ({ onLogin, portalType }) => {
  // ... (all state and handler functions remain untouched)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            {portalType === PortalType.STRATEGY ? 'STRATEGIA' : 'LTS'}
          </h2>
          {/* Finnish Marketing Descriptions */}
          <p className="text-slate-600 mb-4 text-sm px-2">
            {portalType === PortalType.STRATEGY 
              ? 'Strategian tekemisen alusta. Vie liiketoimintasi seuraavalle tasolle markkinadataa hyödyntävän dynaamisen strategiatyökalun avulla.'
              : 'Liiketoimintasuunnitelman rakennusalusta. Tee hyvä liiketoimintasuunnitelma hyödyntämällä markkinadataa, interaktiivista laskuria ja konkariyrittäjien neuvoja.'}
          </p>
          
          <ul className="text-left text-xs text-slate-500 space-y-2 mb-6 max-w-[280px] mx-auto">
            {portalType === PortalType.STRATEGY ? (
              <>
                <li className="flex gap-2"><span>•</span> Interaktiivinen suunnitelman rakentaja</li>
                <li className="flex gap-2"><span>•</span> Toimintaympäristön analyysi</li>
                <li className="flex gap-2"><span>•</span> Strategia ja liiketoimintamalli</li>
                <li className="flex gap-2"><span>•</span> Strategiaporukan yhteistyöalusta</li>
                <li className="flex gap-2"><span>•</span> LLM-malli sparrauskumppanina</li>
              </>
            ) : (
              <>
                <li className="flex gap-2"><span>•</span> Interaktiivinen liiketoimintasuunnitelman rakentaja</li>
                <li className="flex gap-2"><span>•</span> LTS:n tallennus ja analyysi</li>
                <li className="flex gap-2"><span>•</span> LLM-malli sparrauskumppanina</li>
              </>
            )}
          </ul>
        </div>

        {/* 1. KIRJAUDU TAI LUO TUNNUS */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('password')}</label>
              {isLogin && (
                <button type="button" onClick={handleResetPassword} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">
                  {t('forgotPassword')}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
          {message && <p className="text-emerald-500 text-xs text-center font-medium">{message}</p>}

          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
          >
            <span>{isLogin ? 'Kirjaudu sisään' : 'Luo tunnus'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-4 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-slate-500 hover:text-black transition-colors underline underline-offset-4"
          >
            {isLogin ? 'Eikö sinulla ole tunnusta? Luo tunnus' : 'Onko sinulla jo tunnus? Kirjaudu'}
          </button>
        </div>

        {/* HIDDEN FOR NOW (Stripe Integration phase)
            2. KOKEILE DEMOA
            3. OSTA KÄYTTÖOIKEUS
        */}

        {/* ADMIN TAB */}
        <div className="mt-8 pt-8 border-t border-slate-100 space-y-3">
          <button onClick={handleAdminLogin} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl hover:bg-indigo-50 transition-all group border border-indigo-100 bg-indigo-50/50">
            <ShieldCheck className="text-indigo-500 group-hover:text-indigo-700" size={20} />
            <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-800">Kirjaudu Adminina</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
