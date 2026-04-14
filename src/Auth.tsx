import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { PortalType, UserRole } from './types';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Täytä kaikki kentät');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        const role = userDoc.exists() ? (userDoc.data().role as UserRole) : UserRole.STUDENT;
        const pType = userDoc.exists() && userDoc.data().portalType ? (userDoc.data().portalType as PortalType) : (portalType || PortalType.LTS);
        onLogin(email, role, pType);
      } else {
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
 
  const handleAdminLogin = async () => {
    setIsLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, 'johannes@hessonpaja.com', 'Studio80!');
      await setDoc(doc(db, 'users', userCred.user.uid), { email: 'johannes@hessonpaja.com', role: UserRole.ADMIN, portalType: portalType || PortalType.LTS }, { merge: true });
      onLogin('johannes@hessonpaja.com', UserRole.ADMIN, portalType || PortalType.LTS);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8">{isLogin ? 'Kirjaudu' : 'Luo tunnus'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl outline-none" placeholder="Sähköposti" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl outline-none" placeholder="Salasana" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full bg-black text-white py-4 rounded-xl font-bold">Jatka</button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-sm mt-4 text-slate-500">
          {isLogin ? 'Eikö tunnusta? Rekisteröidy' : 'Onko jo tunnus? Kirjaudu'}
        </button>
        <button onClick={handleAdminLogin} className="w-full mt-8 p-4 border border-indigo-100 rounded-xl text-indigo-600 font-bold bg-indigo-50">Kirjaudu Adminina</button>
      </motion.div>
    </div>
  );
};
