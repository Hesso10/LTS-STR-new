import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { PortalType, UserRole } from '../types';
import { Mail, Lock, ArrowRight, UserPlus, ShieldCheck, GraduationCap, User } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthProps {
  onLogin: (email: string, role: UserRole, portal: PortalType) => void;
  portalType?: PortalType;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, portalType }) => {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Syötä sähköpostiosoite ensin.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Salasanan palautuslinkki lähetetty sähköpostiisi.');
    } catch (err: any) {
      console.error(err);
      setError('Salasanan palautus epäonnistui. Tarkista sähköpostiosoite.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('Email or password is incorrect'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        let userCred;
        try {
          userCred = await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          // If login fails because user doesn't exist, check if they have an invite
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            try {
              const invitesRef = collection(db, 'invites');
              const q = query(invitesRef, where('email', '==', email));
              const querySnapshot = await getDocs(q);
              const validInvite = querySnapshot.docs.find(doc => doc.data().used === false);
              
              if (validInvite) {
                // They have an invite, let's create the account for them
                userCred = await createUserWithEmailAndPassword(auth, email, password);
                // We will let the rest of the code handle setting up the user doc and marking invite as used
              } else {
                throw err; // No invite, throw original error
              }
            } catch (inviteErr: any) {
              if (inviteErr.code === 'auth/email-already-in-use') {
                throw new Error('Väärä salasana.');
              }
              throw err; // Throw original error if invite check fails
            }
          } else {
            throw err;
          }
        }

        let role = UserRole.STUDENT;
        let userDocExists = false;
        let userPortalType = portalType;
        let userDocData: any = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
          if (userDoc.exists()) {
            userDocData = userDoc.data();
            role = userDocData.role as UserRole;
            userDocExists = true;
            if (userDocData.portalType) {
              userPortalType = userDocData.portalType;
            }
          }
        } catch (e) {
          console.error('Error fetching user role:', e);
        }

        // Check for pending invites that might upgrade their role
        let shouldUpdateUserDoc = false;
        const userDataToUpdate: any = {};

        if (userDocExists && portalType && userDocData?.portalType !== portalType) {
          shouldUpdateUserDoc = true;
          userDataToUpdate.portalType = portalType;
          userPortalType = portalType;
        }

        try {
          const invitesRef = collection(db, 'invites');
          const q = query(invitesRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          const validInvite = querySnapshot.docs.find(doc => doc.data().used === false);
          
          if (validInvite) {
            const inviteData = validInvite.data();
            const inviteRole = inviteData.role as UserRole;
            
            // Fetch inviter's portalType and companyName to inherit them
            if (inviteData.portalType) {
              userPortalType = inviteData.portalType;
            }
            if (inviteData.companyName) {
              userDataToUpdate.companyName = inviteData.companyName;
              shouldUpdateUserDoc = true;
            }

            if ((!inviteData.portalType || !inviteData.companyName) && inviteData.invitedBy) {
              try {
                const inviterDoc = await getDoc(doc(db, 'users', inviteData.invitedBy));
                if (inviterDoc.exists()) {
                  const inviterData = inviterDoc.data();
                  if (!inviteData.portalType && inviterData.portalType) {
                    userPortalType = inviterData.portalType;
                  }
                  if (!inviteData.companyName && inviterData.companyName) {
                    userDataToUpdate.companyName = inviterData.companyName;
                    shouldUpdateUserDoc = true;
                  }
                }
              } catch (e) {
                console.error('Error fetching inviter data:', e);
              }
            }

            // Only upgrade role if it's "higher" or they don't have a doc
            if (!userDocExists || (role === UserRole.STUDENT && inviteRole !== UserRole.STUDENT)) {
              role = inviteRole;
              shouldUpdateUserDoc = true;
              userDataToUpdate.role = inviteRole;
              userDataToUpdate.inviteId = validInvite.id;
              if (inviteData.canInviteTeamMembers !== undefined) {
                userDataToUpdate.canInviteTeamMembers = inviteData.canInviteTeamMembers;
              }
              if (!userDocExists) {
                userDataToUpdate.email = email;
              }
              if (userPortalType) {
                userDataToUpdate.portalType = userPortalType;
              }
            }
            
            // Mark invite as used
            await setDoc(doc(db, 'invites', validInvite.id), { used: true }, { merge: true });
          }
        } catch (e) {
          console.error('Error checking invites on login:', e);
        }

        if (shouldUpdateUserDoc || !userDocExists) {
          await setDoc(doc(db, 'users', userCred.user.uid), userDataToUpdate, { merge: true });
        }

        onLogin(email, role, userPortalType || PortalType.LTS);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        let assignedRole = UserRole.STUDENT;
        let inviteId: string | undefined = undefined;
        let canInviteTeamMembers = false;
        let userPortalType = portalType;
        let userCompanyName: string | undefined = undefined;
        let invitedBy: string | undefined = undefined;

        try {
          const invitesRef = collection(db, 'invites');
          const q = query(invitesRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          const validInvite = querySnapshot.docs.find(doc => doc.data().used === false);
          
          if (validInvite) {
            const inviteData = validInvite.data();
            assignedRole = inviteData.role as UserRole;
            inviteId = validInvite.id;
            if (inviteData.canInviteTeamMembers !== undefined) {
              canInviteTeamMembers = inviteData.canInviteTeamMembers;
            }
            if (inviteData.invitedBy) {
              invitedBy = inviteData.invitedBy;
            }
            
            // Fetch inviter's portalType and companyName to inherit them
            if (inviteData.portalType) {
              userPortalType = inviteData.portalType;
            }
            if (inviteData.companyName) {
              userCompanyName = inviteData.companyName;
            }

            if ((!inviteData.portalType || !inviteData.companyName) && inviteData.invitedBy) {
              try {
                const inviterDoc = await getDoc(doc(db, 'users', inviteData.invitedBy));
                if (inviterDoc.exists()) {
                  const inviterData = inviterDoc.data();
                  if (!inviteData.portalType && inviterData.portalType) {
                    userPortalType = inviterData.portalType;
                  }
                  if (!inviteData.companyName && inviterData.companyName) {
                    userCompanyName = inviterData.companyName;
                  }
                }
              } catch (e) {
                console.error('Error fetching inviter data:', e);
              }
            }

            // Mark invite as used
            await setDoc(doc(db, 'invites', inviteId), { used: true }, { merge: true });
          }
        } catch (e) {
          console.error('Error checking invites:', e);
        }

        try {
          const userData: any = {
            email: email,
            role: assignedRole,
            canInviteTeamMembers: canInviteTeamMembers
          };
          if (inviteId) {
            userData.inviteId = inviteId;
          }
          if (userPortalType) {
            userData.portalType = userPortalType;
          }
          if (userCompanyName) {
            userData.companyName = userCompanyName;
          }
          if (invitedBy) {
            userData.invitedBy = invitedBy;
          }
          await setDoc(doc(db, 'users', userCred.user.uid), userData);
        } catch (e) {
          console.error('Error setting initial user role:', e);
        }
        onLogin(email, assignedRole, userPortalType || PortalType.LTS);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    setError('');
    const adminEmail = 'johannes@hessonpaja.com';
    const adminPassword = 'Studio80!';

    try {
      let uid = '';
      try {
        const userCred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        uid = userCred.user.uid;
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            uid = userCred.user.uid;
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              alert('Tili on jo olemassa toisella salasanalla. Kirjaudu sisään normaalisti omalla salasanallasi. Jos olet unohtanut salasanan, voit palauttaa sen "Unohtuiko salasana?" -linkistä.');
              setEmail(adminEmail);
              setIsLoading(false);
              return;
            }
            throw createErr;
          }
        } else {
          throw err;
        }
      }
      
      try {
        await setDoc(doc(db, 'users', uid), {
          email: adminEmail,
          role: UserRole.ADMIN
        }, { merge: true });
      } catch (e) {
        console.error('Error setting admin role in db:', e);
      }

      onLogin(adminEmail, UserRole.ADMIN, portalType || PortalType.LTS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Admin login failed');
    } finally {
      setIsLoading(false);
    }
  };



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
          <p className="text-slate-500 text-sm">
            {isLogin ? t('login') : t('signup')}
          </p>
        </div>

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
            <span>{isLogin ? t('login') : t('signup')}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-slate-500 hover:text-black transition-colors"
          >
            {isLogin ? t('noAccount') : t('haveAccount')}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 space-y-3">
          <button onClick={handleAdminLogin} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl hover:bg-indigo-50 transition-all group border border-indigo-100 bg-indigo-50/50">
            <ShieldCheck className="text-indigo-500 group-hover:text-indigo-700" size={20} />
            <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-800">Kirjaudu Adminina (johannes@hessonpaja.com)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
