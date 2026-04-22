import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { PortalType, UserRole } from './types';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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
      setError('');
    } catch (err: any) {
      setError('Palautus epäonnistui. Tarkista sähköpostiosoite.');
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
        // 1. Firebase Sign In
        await signInWithEmailAndPassword(auth, email, password);
        
        // 2. Just call onLogin to pass the portal context to the App
        onLogin(email, UserRole.STUDENT, portalType || PortalType.LTS);
      } else {
        // 3. Registration
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        
        // 4. Create the initial Firestore document
        const userData = { 
          email, 
          role: UserRole.STUDENT, 
          portalType: portalType || PortalType.LTS,
          createdAt: new Date().toISOString()
        };
        
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 tracking-tight">
            Tervetuloa
          </h2>
          <p className="text-slate-500 text-sm">
            {isLogin ? 'Kirjaudu sisään jatkaaksesi' : 'Luo uusi käyttäjätunnus'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase ml-1">
              {t('email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 ring-indigo-500/20" 
                placeholder="email@example.com" 
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between px-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">
                {t('password')}
              </label>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={handleResetPassword} 
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
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
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 ring-indigo-500/20" 
                placeholder="••••••••" 
                required
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-red-500 text-xs text-center font-medium bg-red-50 p-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}
          
          {message && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-emerald-500 text-xs text-center font-medium bg-emerald-50 p-2 rounded-lg"
            >
              {message}
            </motion.p>
          )}

          <button 
            type="submit" 
            disabled={isLoading} 
            className={`w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span>{isLoading ? 'Ladataan...' : isLogin ? 'Kirjaudu sisään' : 'Luo tunnus'}</span>
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] uppercase font-bold tracking-widest">tai</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }} 
            className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-slate-200 active:scale-95"
          >
            {isLogin ? 'Sait kutsun! Luo tunnus' : 'Onko sinulla jo tunnus? Kirjaudu'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
