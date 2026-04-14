// ... (kaikki importit pysyvät samoina)

export default function App() {
  // ... (kaikki useState-tilat pysyvät samoina)

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
          // 1. Määritetään rooli
          let role = UserRole.STUDENT;
          const isAdminEmail = firebaseUser.email === 'johannes@hessonpaja.com' || firebaseUser.email === 'johannes.hesso@innostapersonaltrainer.fi';
          
          if (isAdminEmail) {
            role = UserRole.ADMIN;
          } else if (userDoc.exists() && userDoc.data().role) {
            role = userDoc.data().role as UserRole;
          }
          
          // 2. Määritetään portaali (MUUTETTU LOGIIKKA ADMINILLE)
          let userPortalType = portalType;
          if (userDoc.exists() && userDoc.data().portalType) {
            const dbPortalType = userDoc.data().portalType as PortalType;
            
            // JOS käyttäjä ei ole admin, pakotetaan tietokannan portaali.
            // JOS käyttäjä ON admin, sallitaan portaalin pysyä siinä mitä se on sovelluksessa (vapaa vaihto).
            if (!isAdminEmail && portalType !== dbPortalType) {
              setPortalType(dbPortalType);
              userPortalType = dbPortalType;
            }
          }
            
          const userAccount: UserAccount = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: role,
            portalType: userPortalType || PortalType.LTS,
            teamMembers: userDoc.exists() ? userDoc.data().teamMembers : undefined,
            canInviteTeamMembers: userDoc.exists() ? userDoc.data().canInviteTeamMembers : false,
            invitedBy: userDoc.exists() ? userDoc.data().invitedBy : undefined
          };
          setUser(userAccount);
          if (view === 'LANDING' || view === 'AUTH') {
            setView('DASHBOARD');
          }
        }, (error) => {
          // ... (error-käsittely pysyy samana)
        });
      } else {
        // ... (logout-käsittely pysyy samana)
      }
      setIsAuthReady(true);
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [view, portalType]);

  // ... (muut useEffectit ja funktiot handleLogin, handleLogout pysyvät samoina)

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <div className="font-sans antialiased text-slate-900">
          {view === 'LANDING' ? (
            <LandingPage onSelectPortal={setPortalType} onLogin={() => setView('AUTH')} onDemo={() => { setIsDemo(true); setView('DASHBOARD'); }} />
          ) : view === 'AUTH' ? (
            <Auth onLogin={handleLogin} portalType={portalType || undefined} />
          ) : (
            <div className="flex h-screen bg-slate-100 overflow-hidden">
              <Sidebar 
                portalType={portalType || PortalType.LTS} 
                userRole={user?.role || UserRole.STUDENT}
                activeView={view}
                setActiveView={setView}
                onLogout={handleLogout}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                user={user}
                // LISÄTTY: Mahdollisuus vaihtaa portaalia Sidebarista käsin
                onSwitchPortal={() => setPortalType(portalType === PortalType.LTS ? PortalType.STRATEGY : PortalType.LTS)}
                showSwitchPortal={user?.role === UserRole.ADMIN}
              />
              <main className="flex-1 overflow-y-auto relative p-8">
                {/* ... (main-sisältö pysyy samana) */}
              </main>
            </div>
          )}
          <CookieBanner />
        </div>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
