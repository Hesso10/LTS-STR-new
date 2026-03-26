import React, { useState, useEffect } from 'react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('cookie_accepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const handleAccept = () => {
    localStorage.setItem('cookie_accepted', 'true');
    setIsVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-[100] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      <p className="text-sm text-slate-300 text-center sm:text-left">
        Käytämme evästeitä parantaaksemme käyttökokemustasi. Jatkamalla sivuston käyttöä hyväksyt evästeiden käytön.
      </p>
      <button
        onClick={handleAccept}
        className="whitespace-nowrap bg-white text-slate-900 px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
      >
        Hyväksy
      </button>
    </div>
  );
}
