import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Database, 
  Plus, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Settings,
  Search,
  Mail,
  UserPlus,
  X,
  Layout
} from 'lucide-react';
import { SystemKnowledge, UserAccount, UserRole, PortalType, Invite } from './types';

interface AdminPanelProps {
  users: UserAccount[];
  invites?: Invite[];
  systemKnowledge: SystemKnowledge;
  onUpdateKnowledge: (knowledge: SystemKnowledge) => void;
  onInviteUser: (name: string, email: string, role: UserRole, portalType?: PortalType, companyName?: string) => void;
  onInviteTeamMember?: (name: string, email: string) => void;
  onToggleTeamInvite?: (userId: string, isInvite: boolean, canInvite: boolean) => void;
  onSwitchWorkspace?: (uid: string) => void;
  onNavigate?: (view: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  users = [], // Default to empty array
  invites = [],
  systemKnowledge, 
  onUpdateKnowledge,
  onInviteUser,
  onInviteTeamMember,
  onToggleTeamInvite,
  onSwitchWorkspace,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'KNOWLEDGE'>('USERS');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    portalType?: PortalType;
    companyName?: string;
  }>({ name: '', email: '', role: UserRole.STUDENT });

  const handleUpdateInstructions = (val: string) => {
    onUpdateKnowledge({ ...systemKnowledge, instructions: val });
  };

  // Helper to safely get initials without crashing
  const getInitials = (name?: string, email?: string) => {
    const fallback = name || email || "??";
    return fallback.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Ylläpitopaneeli</h1>
          <p className="text-slate-400 font-medium">Hallitse järjestelmän osaamista ja käyttäjiä.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-black/5 shadow-sm">
          <button onClick={() => setActiveTab('USERS')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'USERS' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}>Käyttäjät</button>
          <button onClick={() => setActiveTab('KNOWLEDGE')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'KNOWLEDGE' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}>Järjestelmän osaaminen</button>
        </div>
      </div>

      {activeTab === 'USERS' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Etsi käyttäjiä..." className="pl-12 pr-6 py-3 bg-white border-none rounded-2xl w-80 shadow-sm focus:ring-2 focus:ring-black/5 outline-none transition-all" />
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => { setInviteData({ ...inviteData, role: UserRole.TEACHER }); setIsInviteModalOpen(true); }} className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm text-sm"><UserPlus size={16} /> Kutsu opettaja</button>
              <button onClick={() => { setInviteData({ ...inviteData, role: UserRole.STUDENT }); setIsInviteModalOpen(true); }} className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm text-sm"><UserPlus size={16} /> Kutsu opiskelija</button>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-black/5 shadow-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-black/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Nimi</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Yritys</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Sähköposti</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Palvelu</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Rooli</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Toiminnot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                          {getInitials(user.displayName, user.email)}
                        </div>
                        <span className="font-bold">{user.displayName || 'Nimetön käyttäjä'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-500 font-medium">{user.companyName || '-'}</td>
                    <td className="px-8 py-6 text-sm text-slate-500 font-medium">{user.email}</td>
                    <td className="px-8 py-6">
                      {user.portalType && (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.portalType === PortalType.LTS ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {user.portalType}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-xs font-bold uppercase text-slate-400">{user.role}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {onSwitchWorkspace && onNavigate && user.role !== UserRole.ADMIN && (
                          <button onClick={() => { onSwitchWorkspace(user.uid); onNavigate?.('DASHBOARD'); }} className="p-2 text-slate-300 hover:text-emerald-600"><Layout size={18} /></button>
                        )}
                        <button className="p-2 text-slate-300 hover:text-indigo-600"><Settings size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {invites.map((invite) => (
                  <tr key={invite.id} className="bg-slate-50/30 opacity-70 italic">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 font-bold text-xs">
                          {getInitials(invite.displayName, invite.email)}
                        </div>
                        <span className="font-bold">{invite.displayName || 'Kutsuttu käyttäjä'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-400">{invite.companyName || '-'}</td>
                    <td className="px-8 py-6 text-sm text-slate-400">{invite.email}</td>
                    <td className="px-8 py-6 text-[10px] font-bold uppercase text-slate-300">{invite.portalType}</td>
                    <td className="px-8 py-6 text-[10px] font-bold uppercase text-slate-300">{invite.role} (Odottaa)</td>
                    <td className="px-8 py-6"><Mail size={16} className="text-slate-200" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-xl">
          <h3 className="text-xl font-black uppercase tracking-tight mb-8">System Instructions</h3>
          <textarea 
            value={systemKnowledge.instructions} 
            onChange={(e) => handleUpdateInstructions(e.target.value)} 
            className="w-full h-80 bg-slate-50 border-none rounded-3xl p-6 focus:ring-2 focus:ring-black/5 outline-none text-sm font-medium leading-relaxed resize-none" 
          />
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative">
            <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-8 right-8 p-2 text-slate-400"><X size={24} /></button>
            <h2 className="text-3xl font-black tracking-tighter uppercase mb-8">Kutsu käyttäjä</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Koko nimi" value={inviteData.name} onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-medium" />
              <input type="email" placeholder="Sähköposti" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-medium" />
              <select value={inviteData.portalType || ''} onChange={(e) => setInviteData({ ...inviteData, portalType: e.target.value as PortalType })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-medium">
                <option value="">Valitse palvelu</option>
                <option value={PortalType.LTS}>LTS</option>
                <option value={PortalType.STRATEGY}>STRATEGIA</option>
              </select>
              <button onClick={() => { onInviteUser(inviteData.name, inviteData.email, inviteData.role, inviteData.portalType); setIsInviteModalOpen(false); }} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-4">Lähetä kutsu</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
