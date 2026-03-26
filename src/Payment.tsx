import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, X, CheckCircle2, Mail } from 'lucide-react';
import { PortalType, UserRole } from './types';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

interface PaymentProps {
  portalType: PortalType;
  onSuccess: () => void;
  onCancel: () => void;
  onDemoLogin?: (email: string, role: UserRole, portal: PortalType) => void;
}

export const Payment: React.FC<PaymentProps> = ({ portalType, onSuccess, onCancel, onDemoLogin }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handlePay = async () => {
    if (!email) {
      alert('Syötä sähköpostiosoite');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // 1. Create user account
      const password = Math.random().toString(36).slice(-8) + 'A1!'; // Generate random password
      let uid = '';
      
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCred.user.uid;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // If user exists, just sign them in (for testing purposes)
          // In a real app, we would ask them to log in first
          alert('Tällä sähköpostilla on jo tili. Kirjaudu sisään etusivulta.');
          setIsProcessing(false);
          return;
        }
        throw err;
      }

      // 2. Set user role in Firestore
      await setDoc(doc(db, 'users', uid), {
        email: email,
        role: UserRole.USER,
        portalType: portalType
      }, { merge: true });

      // 3. Send welcome email via trigger
      try {
        const mailRef = collection(db, 'mail');
        await addDoc(mailRef, {
          to: email,
          message: {
            subject: `Tervetuloa StaffyRules -järjestelmään!`,
            html: `
              <h2>Kiitos tilauksestasi!</h2>
              <p>Käyttöoikeutesi <strong>${portalType}</strong>-portaaliin on nyt aktivoitu.</p>
              <p>Voit kirjautua sisään osoitteessa: <br/>
              Sähköposti: ${email}<br/>
              Salasana: ${password}</p>
              <p>Suosittelemme vaihtamaan salasanasi ensimmäisen kirjautumisen yhteydessä.</p>
              <br/>
              <p>Ystävällisin terveisin,<br/>StaffyRules Tiimi</p>
            `
          }
        });
      } catch (e) {
        console.error('Error sending welcome email:', e);
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onDemoLogin) {
          onDemoLogin(email, UserRole.USER, portalType);
        } else {
          onSuccess();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('Jotain meni vikaan. Yritä uudelleen.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[40px] shadow-2xl w-full max-w-md text-center border border-black/5"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Maksu onnistui!</h2>
          <p className="text-slate-400 font-medium">Tarkista sähköpostisi ({email}). Siirrytään sovellukseen...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl border border-black/5 overflow-hidden"
      >
        <div className="p-10 bg-slate-900 text-white flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Tilaus</h2>
            <p className="text-slate-400 font-medium">Käyttöoikeus {portalType}-portaaliin</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="flex justify-between items-center pb-8 border-b border-black/5">
            <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Yhteensä</span>
            <span className="text-4xl font-black tracking-tighter">99,00 €</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sähköposti (Tunnuksen luontia varten)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="matti@esimerkki.fi"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                />
              </div>
            </div>
            
            <div className="space-y-1 pt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Kortin tiedot</label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  placeholder="4242 4242 4242 4242"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="MM / YY"
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-mono"
              />
              <input 
                type="text" 
                placeholder="CVC"
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <ShieldCheck className="text-emerald-500" size={20} />
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Turvallinen Stripe-maksu</p>
          </div>

          <button 
            onClick={handlePay}
            disabled={isProcessing || !email}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Maksa nyt</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
