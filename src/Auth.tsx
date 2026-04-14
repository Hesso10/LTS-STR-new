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
