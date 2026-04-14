import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { PortalType, UserRole } from './types';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
 
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
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Palautuslinkki lähetetty sähköpostiisi.');
    } catch (err: any) {
      setError('Palautus epäonnistui.');
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
    setMessage('');
    try {
      if (isLogin) {
        // 1. Kirjaudutaan sisään
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        
        // 2. Luetaan käyttäjän tiedot
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        
        // 3. Määritetään rooli (Kova tarkistus sähköpostille, jotta et jää ulos)
        let role = UserRole.STUDENT;
        if (email === 'johannes@hessonpaja.com' || email === 'johannes.hesso@innostapersonaltrainer.fi') {
          role = UserRole.ADMIN;
        } else if (userDoc.exists() && userDoc.data().role) {
          role = userDoc.data().role as UserRole;
        }

        // 4. Määritetään portaali
        const pType = userDoc.exists() && userDoc.data().portalType 
          ? (userDoc.data().portalType as PortalType) 
          : (portalType || PortalType.LTS);

        // 5. Kutsutaan App.tsx:n logiikkaa
        onLogin(email, role, pType);
      } else {
        // Rekisteröityminen
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const userData = { email, role: UserRole.STUDENT, portalType: portalType || PortalType.LTS };
        await setDoc(doc(db, 'users', userCred.user.uid), userData);
        onLogin(email, UserRole.STUDENT, userData.portalType);
      }
    } catch (err: any) {
      setError(err.message);
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
            <label className="text-xs font-semibold text-slate-400 uppercase ml-1">{t('email')}</label>
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
            <span>{isLogin ? 'Kirjaudu sisään' : 'Luo tunnus'}</span>
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
