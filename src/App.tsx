import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { PortalType, UserRole } from './types';
import { Mail, Lock, ArrowRight } from 'lucide-react'; // ShieldCheck poistettu täältä
import { auth, db } from './firebase';
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
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            try {
              const invitesRef = collection(db, 'invites');
              const q = query(invitesRef, where('email', '==', email));
              const querySnapshot = await getDocs(q);
              const validInvite = querySnapshot.docs.find(doc => doc.data().used === false);
              if (validInvite) {
                userCred = await createUserWithEmailAndPassword(auth, email, password);
              } else {
                throw err;
              }
            } catch (inviteErr: any) {
              if (inviteErr.code === 'auth/email-already-in-use') {
                throw new Error('Väärä salasana.');
              }
              throw err;
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
            if (inviteData.portalType) userPortalType = inviteData.portalType;
            if (inviteData.companyName) {
              userDataToUpdate.companyName = inviteData.companyName;
              shouldUpdateUserDoc = true;
            }
            if (!userDocExists || (role === UserRole.STUDENT && inviteRole !== UserRole.STUDENT)) {
              role = inviteRole;
              shouldUpdateUserDoc = true;
              userDataToUpdate.role = inviteRole;
              userDataToUpdate.inviteId = validInvite.id;
              if (inviteData.canInviteTeamMembers !== undefined) userDataToUpdate.canInviteTeamMembers = inviteData.canInviteTeamMembers;
              if (!userDocExists) userDataToUpdate.email = email;
              if (userPortalType) userDataToUpdate.portalType = userPortalType;
            }
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
        try {
          const invitesRef = collection(db, 'invites');
          const q = query(invitesRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          const validInvite = querySnapshot.docs.find(doc => doc.data().used === false);
          if (validInvite) {
            const inviteData = validInvite.data();
            assignedRole = inviteData.role as UserRole;
            inviteId = validInvite.id;
            if (inviteData.canInviteTeamMembers !== undefined) canInviteTeamMembers = inviteData.canInviteTeamMembers;
            if (inviteData.portalType) userPortalType = inviteData.portalType;
            if (inviteData.companyName) userCompanyName = inviteData.companyName;
            await setDoc(doc(db, 'invites', inviteId), { used: true }, { merge: true });
          }
        } catch (e) {
          console.error('Error checking invites:', e);
        }
        const userData: any = { email, role: assignedRole, canInviteTeamMembers };
        if (inviteId) userData.inviteId = inviteId;
        if (userPortalType) userData.portalType = userPortalType;
        if (userCompanyName) userData.companyName = userCompanyName;
        await setDoc(doc(db, 'users', userCred.user.uid), userData);
        onLogin(email, assignedRole, userPortalType || PortalType.LTS);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">{portalType === PortalType.STRATEGY ? 'STRATEGIA' : 'LTS'}</h2>
          <p className="text-slate-500 text-sm">{isLogin ? 'Kirjaudu sisään' : 'Luo tunnus'}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none" placeholder="email@example.com" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between px-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">{t('password')}</label>
              {isLogin && <button type="button" onClick={handleResetPassword} className="text-[10px] font-bold text-indigo-600">{t('forgotPassword')}</button>}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none" placeholder="••••••••" />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          {message && <p className="text-emerald-500 text-xs text-center">{message}</p>}
          <button type="submit" disabled={isLoading} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
            <span>{isLogin ? 'Luo tunnus / Kirjaudu sisään' : 'Luo tunnus'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-slate-500">
            {isLogin ? 'Eikö sinulla ole tunnusta? Luo tunnus' : 'Onko sinulla jo tunnus? Kirjaudu'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
