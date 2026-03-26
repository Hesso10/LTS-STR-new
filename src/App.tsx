/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './LanguageContext';
import { LandingPage } from './LandingPage';
import { Auth } from './Auth';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { StrategyPortal } from './StrategyPortal';
import { PlanBuilder } from './PlanBuilder';
import { AdminPanel } from './AdminPanel';
import { Profile } from './Profile';
import { Payment } from './Payment';
import { VerificationScreen } from './VerificationScreen';
import { AIChat } from './AIChat';
import { CookieBanner } from './CookieBanner';
import { PortalType, UserRole, UserAccount, SystemKnowledge } from './types';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, addDoc, setDoc, query, where } from 'firebase/firestore';

// Simple Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-black mb-4">Hups! Jotain meni vikaan.</h1>
            <p className="text-slate-500 mb-8">Sovellus kohtasi odottamattoman virheen. Kokeile ladata sivu uudelleen.</p>
            {this.state.error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-left text-sm mb-8 overflow-auto max-h-48">
                {this.state.error.message}
              </div>
            )}
            <button onClick={() => window.location.reload()} className="bg-black text-white px-8 py-4 rounded-2xl font-bold">Lataa sivu uudelleen</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MOCK_USERS: UserAccount[] = [
  { uid: 'admin1', email: 'johannes.hesso@innostapersonaltrainer.fi', displayName: 'Johannes', role: UserRole.ADMIN },
  { uid: 'teacher1', email: 'opettaja@esimerkki.fi', displayName: 'Opettaja Matti', role: UserRole.TEACHER },
  { uid: 'student1', email: 'matti@esimerkki.fi', displayName: 'Matti Meikäläinen', role: UserRole.STUDENT, portalType: PortalType.STRATEGY, companyName: 'Staffyrules Oy' },
  { uid: 'student2', email: 'sanna@esimerkki.fi', displayName: 'Sanna Suomalainen', role: UserRole.STUDENT, portalType: PortalType.LTS, companyName: 'Staffivoimaa Oy' },
];

const DEFAULT_KNOWLEDGE: SystemKnowledge = {
  links: [
    { id: 'l1', title: 'Tilastokeskus - Suhdanneindikaattorit', url: 'https://stat.fi', category: 'Ulkoinen toimintaympäristö' },
    { id: 'l2', title: 'Sitra Megatrendit 2024', url: 'https://sitra.fi', category: 'Ulkoinen toimintaympäristö' }
  ],
  documents: [],
  instructions: 'Olet kokenut ja ytimekäs liiketoimintastrategi. Vastaa aina niin, että käyttämäsi lähteet todella vastaavat siihen LTS tai STRATEGIA osa-alueeseen, jonka käyttäjä on valinnut. Päätehtäväsi on tarjota esimerkkejä ja tilastodataa ladatun materiaalin avulla.'
};

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [portalType, setPortalType] = useState<PortalType | null>(null);
  const [view, setView] = useState('LANDING');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isDemo, setIsDemo] = useState(false);
  const [viewingWorkspaceAs, setViewingWorkspaceAs] = useState<string | null>(null);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>(MOCK_USERS);
  const [invites, setInvites] = useState<any[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<any[]>([]);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge>(DEFAULT_KNOWLEDGE);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Validate Connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDoc(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Listen to user role from Firestore in real-time
          unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
            let role = UserRole.STUDENT;
            if (firebaseUser.email === 'johannes@hessonpaja.com') {
              role = UserRole.ADMIN;
            } else if (userDoc.exists() && userDoc.data().role) {
              role = userDoc.data().role as UserRole;
            }
            
            // If the document has pending writes, the server hasn't confirmed the role update yet.
            // We should wait for the server to confirm before trusting the role for security-critical operations,
            // otherwise subsequent onSnapshot listeners will fail with permission-denied.
            if (userDoc.metadata.hasPendingWrites && role === UserRole.ADMIN && firebaseUser.email !== 'johannes@hessonpaja.com') {
              console.log('Waiting for server to confirm role update...');
              return;
            }
            
            let userPortalType = portalType;
            if (userDoc.exists() && userDoc.data().portalType) {
              userPortalType = userDoc.data().portalType as PortalType;
              if (portalType !== userPortalType) {
                setPortalType(userPortalType);
                localStorage.setItem('app_portal', userPortalType);
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
            
            // If we were on landing or auth, move to dashboard
            if (view === 'LANDING' || view === 'AUTH') {
              setView('DASHBOARD');
            }
          }, (error) => {
            console.error('Error fetching user doc:', error);
            // Fallback to student role if we can't fetch the doc
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: firebaseUser.email === 'johannes@hessonpaja.com' ? UserRole.ADMIN : UserRole.STUDENT,
              portalType: portalType || PortalType.LTS,
              canInviteTeamMembers: false,
              invitedBy: undefined
            });
            if (view === 'LANDING' || view === 'AUTH') {
              setView('DASHBOARD');
            }
          });
        } catch (error) {
          console.error('Error setting up user listener:', error);
        }
      } else {
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }
        setUser(null);
        // Only force landing if we're not in a portal and not in demo mode
        if (view !== 'LANDING' && view !== 'PAYMENT' && !isDemo && !portalType) {
          setView('LANDING');
        }
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [view, portalType]);

  // Mock persistence for other things
  // Fetch users if admin
  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeInvites: (() => void) | null = null;
    let unsubscribeReceivedInvites: (() => void) | null = null;
    
    if (user) {
      try {
        if (user.role === UserRole.ADMIN) {
          unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const fetchedUsers: UserAccount[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              fetchedUsers.push({
                uid: doc.id,
                email: data.email || '',
                displayName: data.displayName || data.email?.split('@')[0] || 'User',
                role: data.role as UserRole,
                portalType: data.portalType as PortalType,
                companyName: data.companyName,
                invitedBy: data.invitedBy,
                teamMembers: data.teamMembers,
                canInviteTeamMembers: data.canInviteTeamMembers || false
              });
            });
            setUsers(fetchedUsers);
          }, (error) => {
            console.error('Error fetching users:', error);
          });
        }

        const invitesQuery = user.role === UserRole.ADMIN 
          ? collection(db, 'invites')
          : query(collection(db, 'invites'), where('invitedBy', '==', user.uid));
          
        unsubscribeInvites = onSnapshot(invitesQuery, (snapshot) => {
          const fetchedInvites: any[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedInvites.push({
              id: doc.id,
              ...data
            });
          });
          setInvites(fetchedInvites);
        }, (error) => {
          console.error('Error fetching invites:', error);
        });

        const receivedInvitesQuery = query(collection(db, 'invites'), where('email', '==', user.email));
        unsubscribeReceivedInvites = onSnapshot(receivedInvitesQuery, (snapshot) => {
          const fetchedReceivedInvites: any[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedReceivedInvites.push({
              id: doc.id,
              ...data
            });
          });
          setReceivedInvites(fetchedReceivedInvites);
        }, (error) => {
          console.error('Error fetching received invites:', error);
        });
      } catch (error) {
        console.error('Error setting up listeners:', error);
      }
    }
    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeInvites) unsubscribeInvites();
      if (unsubscribeReceivedInvites) unsubscribeReceivedInvites();
    };
  }, [user?.role, user?.uid]);

  useEffect(() => {
    const savedPortal = localStorage.getItem('app_portal');
    const savedKnowledge = localStorage.getItem('app_knowledge');
    if (savedPortal) setPortalType(savedPortal as PortalType);
    if (savedKnowledge) setSystemKnowledge(JSON.parse(savedKnowledge));
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(doc(db, 'settings', 'systemKnowledge'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemKnowledge;
        setSystemKnowledge(data);
        localStorage.setItem('app_knowledge', JSON.stringify(data));
      }
    }, (error) => {
      console.error('Error fetching systemKnowledge:', error);
    });
    
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  const handleLogin = (email: string, role: UserRole, portal: PortalType) => {
    // The actual login is now handled in Auth.tsx via Firebase.
    // This function is just a callback to set local state if needed before the auth listener fires.
    setPortalType(portal);
    localStorage.setItem('app_portal', portal);
    setIsDemo(email.startsWith('demo_'));
  };

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
    setPortalType(null);
    setView('LANDING');
    setIsDemo(false);
    setIsChatOpen(false);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_portal');
  };

  const handleUpdateKnowledge = async (knowledge: SystemKnowledge) => {
    setSystemKnowledge(knowledge);
    localStorage.setItem('app_knowledge', JSON.stringify(knowledge));
    if (user?.role === UserRole.ADMIN) {
      try {
        await setDoc(doc(db, 'settings', 'systemKnowledge'), knowledge);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'settings/systemKnowledge');
      }
    }
  };

  const sendInviteEmail = async (email: string, name: string, role: string, inviterName: string) => {
    try {
      let appUrl = window.location.origin;
      // Jos olemme AI Studion kehitysympäristössä (ais-dev-), vaihdetaan linkki jaettuun versioon (ais-pre-),
      // jotta ulkopuoliset käyttäjät pääsevät kirjautumaan sisään ilman AI Studio -tunnuksia.
      if (appUrl.includes('ais-dev-')) {
        appUrl = appUrl.replace('ais-dev-', 'ais-pre-');
      }
      
      const mailRef = collection(db, 'mail');
      await addDoc(mailRef, {
        to: email,
        invitedRole: role,
        message: {
          subject: `Kutsu järjestelmään - ${role}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #333;">Hei ${name}!</h2>
              <p style="color: #555; line-height: 1.5;"><strong>${inviterName}</strong> on kutsunut sinut järjestelmään roolilla: <strong>${role}</strong>.</p>
              <p style="color: #555; line-height: 1.5;">Pääset kirjautumaan sisään ja aloittamaan käytön alla olevasta painikkeesta:</p>
              <div style="margin: 30px 0;">
                <a href="${appUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Siirry sovellukseen</a>
              </div>
              <p style="color: #555; line-height: 1.5;">Tervetuloa mukaan!</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">Tämä on automaattinen viesti, älä vastaa tähän sähköpostiin.</p>
            </div>
          `
        }
      });
      console.log('Kutsu lähetetty sähköpostiin:', email);
    } catch (error) {
      console.error('Error sending invite email:', error);
    }
  };

  const handleInviteUser = async (name: string, email: string, role: UserRole, portalType?: PortalType, companyName?: string) => {
    try {
      const inviteId = Math.random().toString(36).substr(2, 9);
      const inviteData: any = {
        email,
        displayName: name,
        role,
        invitedBy: user?.uid || 'admin',
        createdAt: new Date().toISOString(),
        used: false
      };
      
      if (portalType) inviteData.portalType = portalType;
      if (companyName) inviteData.companyName = companyName;

      await setDoc(doc(db, 'invites', inviteId), inviteData);
      await sendInviteEmail(email, name, role, user?.displayName || 'Järjestelmänvalvoja');
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Käyttäjän kutsuminen epäonnistui.');
    }
  };

  const handleInviteTeamMember = async (name: string, email: string) => {
    if (!user) return;
    try {
      const inviteId = Math.random().toString(36).substr(2, 9);
      const actualInviterUid = user.role === UserRole.TEAM_MEMBER && user.invitedBy ? user.invitedBy : user.uid;
      
      await setDoc(doc(db, 'invites', inviteId), {
        email,
        displayName: name,
        role: UserRole.TEAM_MEMBER,
        invitedBy: actualInviterUid,
        createdAt: new Date().toISOString(),
        used: false
      });
      
      try {
        const targetDocRef = doc(db, 'users', actualInviterUid);
        const targetDocSnap = await getDoc(targetDocRef);
        
        if (targetDocSnap.exists()) {
          const targetData = targetDocSnap.data();
          const updatedTeamMembers = [...(targetData.teamMembers || []), { name, email }];
          
          await setDoc(targetDocRef, {
            teamMembers: updatedTeamMembers
          }, { merge: true });
          
          if (actualInviterUid === user.uid) {
            const updatedUser = { ...user, teamMembers: updatedTeamMembers };
            setUser(updatedUser);
            localStorage.setItem('app_user', JSON.stringify(updatedUser));
          }
        }
      } catch (userUpdateError) {
        console.warn('Could not update user team members list, but invite was sent:', userUpdateError);
      }
      
      await sendInviteEmail(email, name, 'team_member', user.displayName || 'Käyttäjä');
    } catch (error) {
      console.error('Error inviting team member:', error);
      alert('Tiimin jäsenen kutsuminen epäonnistui.');
    }
  };

  const handleToggleTeamInvite = async (id: string, isInvite: boolean, canInvite: boolean) => {
    try {
      const collectionName = isInvite ? 'invites' : 'users';
      await setDoc(doc(db, collectionName, id), {
        canInviteTeamMembers: canInvite
      }, { merge: true });
    } catch (error) {
      console.error('Error toggling team invite permission:', error);
      alert('Käyttöoikeuden muuttaminen epäonnistui.');
    }
  };

  const handleRemoveTeamMember = async (emailToRemove: string) => {
    if (!user) return;
    try {
      const actualInviterUid = user.role === UserRole.TEAM_MEMBER && user.invitedBy ? user.invitedBy : user.uid;
      const targetDocRef = doc(db, 'users', actualInviterUid);
      const targetDocSnap = await getDoc(targetDocRef);
      
      if (targetDocSnap.exists()) {
        const targetData = targetDocSnap.data();
        const updatedTeamMembers = (targetData.teamMembers || []).filter((m: { email: string }) => m.email !== emailToRemove);
        
        await setDoc(targetDocRef, {
          teamMembers: updatedTeamMembers
        }, { merge: true });
        
        if (actualInviterUid === user.uid) {
          const updatedUser = { ...user, teamMembers: updatedTeamMembers };
          setUser(updatedUser);
          localStorage.setItem('app_user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Tiimin jäsenen poistaminen epäonnistui.');
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return;
    try {
      const inviteRef = doc(db, 'invites', inviteId);
      const inviteSnap = await getDoc(inviteRef);
      
      if (inviteSnap.exists()) {
        const inviteData = inviteSnap.data();
        
        // Mark invite as used
        await setDoc(inviteRef, { used: true }, { merge: true });
        
        // If it's a team member invite, we don't change the user's role,
        // but we could update their invitedBy if they don't have one.
        // However, since they can be in multiple teams, we rely on the invites collection
        // to show them their teams.
        
        alert('Kutsu hyväksytty! Voit nyt siirtyä tiimin työtilaan.');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Kutsun hyväksyminen epäonnistui.');
    }
  };

  const renderView = () => {
    if (view === 'DASHBOARD') {
      if (portalType === PortalType.STRATEGY) {
        return <StrategyPortal onNavigate={setView} user={user} viewingWorkspaceAs={viewingWorkspaceAs} />;
      }
      return <Dashboard portalType={PortalType.LTS} onNavigate={setView} user={user} />;
    }

    if (view === 'ADMIN' && user?.role === UserRole.ADMIN) {
      return (
        <AdminPanel 
          users={users} 
          invites={invites}
          systemKnowledge={systemKnowledge} 
          onUpdateKnowledge={handleUpdateKnowledge}
          onInviteUser={handleInviteUser}
          onInviteTeamMember={handleInviteTeamMember}
          onToggleTeamInvite={handleToggleTeamInvite}
          onSwitchWorkspace={setViewingWorkspaceAs}
          onNavigate={setView}
        />
      );
    }

    if (view === 'PROFILE') {
      return (
        <Profile 
          user={user || MOCK_USERS[0]} 
          portalType={portalType || PortalType.LTS} 
          invites={invites}
          receivedInvites={receivedInvites}
          onUpdate={async (updates) => {
            if (!user) return;
            try {
              await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
              setUser(prev => prev ? { ...prev, ...updates } : null);
              alert('Tiedot tallennettu onnistuneesti!');
            } catch (error) {
              console.error('Error updating profile:', error);
              alert('Tietojen tallennus epäonnistui.');
            }
          }}
          teamMembers={user?.teamMembers}
          onInviteTeamMember={handleInviteTeamMember}
          onInviteUser={handleInviteUser}
          onRemoveTeamMember={handleRemoveTeamMember}
          viewingWorkspaceAs={viewingWorkspaceAs}
          onSwitchWorkspace={setViewingWorkspaceAs}
          onAcceptInvite={handleAcceptInvite}
        />
      );
    }

    // Plan Builder handles multiple sections
    return (
      <PlanBuilder 
        portalType={portalType || PortalType.LTS} 
        activeSection={view} 
        isReadOnly={isDemo}
        user={user}
        viewingWorkspaceAs={viewingWorkspaceAs}
      />
    );
  };

  const renderContent = () => {
    if (view === 'LANDING') return (
      <LandingPage 
        onSelectPortal={(p) => { 
          setPortalType(p); 
          localStorage.setItem('app_portal', p);
          setView('PAYMENT'); 
          setIsDemo(false);
        }} 
        onDemo={(p) => { 
          setPortalType(p); 
          localStorage.setItem('app_portal', p);
          setIsDemo(true); 
          setView('DASHBOARD'); 
        }} 
        onLogin={(p) => {
          if (p) {
            setPortalType(p);
            localStorage.setItem('app_portal', p);
          }
          setView('AUTH');
        }} 
      />
    );
    if (view === 'PAYMENT') return (
      <Payment 
        portalType={portalType!} 
        onSuccess={() => setView('AUTH')} 
        onCancel={() => {
          if (isDemo || user) {
            setView('DASHBOARD');
          } else {
            setView('LANDING');
          }
        }} 
        onDemoLogin={(email, role, portal) => {
          handleLogin(email, role, portal);
          setIsDemo(true);
          setView('DASHBOARD');
        }}
      />
    );
    if (view === 'AUTH') return <Auth onLogin={handleLogin} portalType={portalType || undefined} />;
    if (isVerifying) return <VerificationScreen email={user?.email || ''} onBackToLogin={() => setIsVerifying(false)} />;

    return (
      <div className="flex h-screen bg-slate-100 overflow-hidden">
        <Sidebar 
          portalType={portalType || PortalType.LTS} 
          userRole={user?.role || UserRole.STUDENT}
          activeView={view}
          setActiveView={setView}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          showSwitchPortal={user?.role === UserRole.ADMIN}
          onSwitchPortal={() => setPortalType(portalType === PortalType.LTS ? PortalType.STRATEGY : PortalType.LTS)}
          user={user}
        />
        <main className="flex-1 overflow-y-auto relative scroll-smooth flex flex-col">
          {viewingWorkspaceAs && (
            <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-md z-50 sticky top-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest">Katselutila:</span>
                <span className="text-sm font-medium">Tarkastelet toisen käyttäjän työtilaa ({viewingWorkspaceAs})</span>
              </div>
              <button 
                onClick={() => {
                  setViewingWorkspaceAs(null);
                  setView('DASHBOARD');
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
              >
                Palaa omaan työtilaan
              </button>
            </div>
          )}
          <div className="flex-1 px-3 pt-20 pb-6 md:p-12 max-w-5xl mx-auto w-full min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={['DASHBOARD', 'PROFILE', 'ADMIN'].includes(view) ? view : 'PLAN_BUILDER'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop AI Chat Drawer */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 450, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="hidden lg:block border-l border-black/5 bg-white z-40 overflow-hidden shrink-0"
              >
                <div className="w-[450px] h-full">
                  <AIChat 
                    portalType={portalType || PortalType.LTS} 
                    onClose={() => setIsChatOpen(false)} 
                    activeSection={view} 
                    systemKnowledge={systemKnowledge}
                    user={user}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile AI Chat Bottom Sheet */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-50 lg:hidden bg-white flex flex-col pt-12"
              >
                <div className="absolute top-0 left-0 right-0 h-12 bg-slate-900 flex items-center justify-center rounded-t-3xl -mt-4">
                  <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>
                <AIChat 
                  portalType={portalType || PortalType.LTS} 
                  onClose={() => setIsChatOpen(false)} 
                  activeSection={view}
                  isMobile
                  systemKnowledge={systemKnowledge}
                  user={user}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating AI Chat Trigger (only visible when chat is closed) */}
          <div className="fixed bottom-8 right-8 z-50">
            <AnimatePresence>
              {!isChatOpen && (
                <motion.button 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={() => setIsChatOpen(true)}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <MessageSquare size={28} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 border-4 border-slate-100 rounded-full" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <div className="font-sans antialiased text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
          {renderContent()}
          <CookieBanner />
        </div>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
