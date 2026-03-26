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
  Shield,
  Search,
  Mail,
  UserPlus,
  ArrowRight,
  CheckCircle2,
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
  users, 
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

  const handleAddLink = () => {
    const title = prompt('Linkin nimi:');
    const url = prompt('URL:');
    if (title && url) {
      const newLink = { id: Math.random().toString(36).substr(2, 9), title, url, category: 'Ulkoinen toimintaympäristö' };
      onUpdateKnowledge({ ...systemKnowledge, links: [...systemKnowledge.links, newLink] });
    }
  };

  const handleRemoveLink = (id: string) => {
    onUpdateKnowledge({ ...systemKnowledge, links: systemKnowledge.links.filter(l => l.id !== id) });
  };

  const handleUpdateInstructions = (val: string) => {
    onUpdateKnowledge({ ...systemKnowledge, instructions: val });
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Ylläpitopaneeli</h1>
          <p className="text-slate-400 font-medium">Hallitse järjestelmän osaamista ja käyttäjiä.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-black/5 shadow-sm">
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'USERS' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}
          >
            Käyttäjät
          </button>
          <button 
            onClick={() => setActiveTab('KNOWLEDGE')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'KNOWLEDGE' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}
          >
            Järjestelmän osaaminen
          </button>
        </div>
      </div>

      {activeTab === 'USERS' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Etsi käyttäjiä..." 
                className="pl-12 pr-6 py-3 bg-white border-none rounded-2xl w-80 shadow-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => { setInviteData({ ...inviteData, role: UserRole.TEACHER }); setIsInviteModalOpen(true); }}
                className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
              >
                <UserPlus size={16} />
                Kutsu opettaja
              </button>
              <button 
                onClick={() => { setInviteData({ ...inviteData, role: UserRole.STUDENT }); setIsInviteModalOpen(true); }}
                className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
              >
                <UserPlus size={16} />
                Kutsu opiskelija
              </button>
              <button 
                onClick={() => { setInviteData({ ...inviteData, role: UserRole.USER }); setIsInviteModalOpen(true); }}
                className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
              >
                <UserPlus size={16} />
                Kutsu käyttäjä
              </button>
              <button 
                onClick={() => { setInviteData({ ...inviteData, role: UserRole.TEAM_MEMBER }); setIsInviteModalOpen(true); }}
                className="bg-black text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg text-sm"
              >
                <Plus size={16} />
                Kutsu tiimin jäsen
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-black/5 shadow-xl overflow-x-auto table-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
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
                          {user.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold">{user.displayName}</span>
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
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {onSwitchWorkspace && onNavigate && user.role !== UserRole.ADMIN && (
                          <button 
                            onClick={() => {
                              onSwitchWorkspace(user.uid);
                              onNavigate('DASHBOARD');
                            }}
                            title="Siirry käyttäjän työtilaan"
                            className="p-2 rounded-xl transition-colors text-slate-300 hover:bg-slate-100 hover:text-emerald-600"
                          >
                            <Layout size={18} />
                          </button>
                        )}
                        {onToggleTeamInvite && user.role !== UserRole.ADMIN && (
                          <button 
                            onClick={() => onToggleTeamInvite(user.uid, false, !user.canInviteTeamMembers)}
                            title={user.canInviteTeamMembers ? "Estä tiimikutsut" : "Salli tiimikutsut"}
                            className={`p-2 rounded-xl transition-colors ${user.canInviteTeamMembers ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}`}
                          >
                            <Users size={18} />
                          </button>
                        )}
                        <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                          <Settings size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-slate-50/50 transition-colors group opacity-60">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs border border-dashed border-slate-300">
                          {invite.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold italic">{invite.displayName} (Kutsuttu)</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-500 font-medium">{invite.companyName || '-'}</td>
                    <td className="px-8 py-6 text-sm text-slate-500 font-medium">{invite.email}</td>
                    <td className="px-8 py-6">
                      {invite.portalType ? (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${invite.portalType === PortalType.LTS ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {invite.portalType}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {invite.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {onToggleTeamInvite && invite.role !== UserRole.ADMIN && (
                          <button 
                            onClick={() => onToggleTeamInvite(invite.id, true, !invite.canInviteTeamMembers)}
                            title={invite.canInviteTeamMembers ? "Estä tiimikutsut" : "Salli tiimikutsut"}
                            className={`p-2 rounded-xl transition-colors ${invite.canInviteTeamMembers ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}`}
                          >
                            <Users size={18} />
                          </button>
                        )}
                        <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                          <Settings size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight">System Instructions</h3>
                <button className="p-2 text-slate-300 hover:text-black transition-colors">
                  <Settings size={18} />
                </button>
              </div>
              <textarea 
                value={systemKnowledge.instructions}
                onChange={(e) => handleUpdateInstructions(e.target.value)}
                className="w-full h-80 bg-slate-50 border-none rounded-3xl p-6 focus:ring-2 focus:ring-black/5 outline-none text-sm font-medium leading-relaxed resize-none"
                placeholder="Kirjoita tekoälyn ohjeet tähän..."
              ></textarea>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight">Tilastolinkit & Lähteet</h3>
                <button 
                  onClick={handleAddLink}
                  className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-4">
                {systemKnowledge.links.map((link) => (
                  <div key={link.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <ExternalLink size={18} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold truncate">{link.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{link.category}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveLink(link.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {systemKnowledge.links.length === 0 && (
                  <p className="text-center text-slate-300 font-medium italic py-8">Ei vielä linkkejä.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight">Järjestelmän liitetiedostot</h3>
                <div className="flex gap-2">
                  <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-black/5">
                    <option>Ulkoinen toimintaympäristö</option>
                    <option>Sisäinen toimintaympäristö</option>
                    <option>Strategia ja liiketoimintamalli</option>
                    <option>Laskelmat</option>
                    <option>Markkinointi</option>
                    <option>Muut</option>
                  </select>
                  <button className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {systemKnowledge.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{doc.category}</p>
                    </div>
                    <button className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {systemKnowledge.documents.length === 0 && (
                  <p className="text-center text-slate-300 font-medium italic py-8">Ei vielä dokumentteja.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative"
          >
            <button 
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
            >
              <X size={24} />
            </button>
            <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Kutsu käyttäjä</h2>
            <p className="text-slate-400 font-medium mb-8">
              Lähetä kutsu uudelle {
                inviteData.role === UserRole.TEACHER ? 'opettajalle' : 
                inviteData.role === UserRole.STUDENT ? 'opiskelijalle' :
                inviteData.role === UserRole.USER ? 'käyttäjälle' :
                'tiimin jäsenelle'
              }.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Koko nimi</label>
                <input 
                  type="text" 
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                  placeholder="Matti Meikäläinen"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sähköposti</label>
                <input 
                  type="email" 
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                  placeholder="matti@esimerkki.fi"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Yritys (valinnainen)</label>
                <input 
                  type="text" 
                  value={inviteData.companyName || ''}
                  onChange={(e) => setInviteData({ ...inviteData, companyName: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                  placeholder="Yritys Oy"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Palvelu</label>
                <select 
                  value={inviteData.portalType || ''}
                  onChange={(e) => setInviteData({ ...inviteData, portalType: e.target.value as PortalType || undefined })}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium appearance-none"
                >
                  <option value="">Ei valittu</option>
                  <option value={PortalType.LTS}>LTS</option>
                  <option value={PortalType.STRATEGY}>STRATEGIA</option>
                </select>
              </div>
              <button 
                onClick={() => {
                  if (inviteData.role === UserRole.TEAM_MEMBER && onInviteTeamMember) {
                    onInviteTeamMember(inviteData.name, inviteData.email);
                  } else {
                    onInviteUser(inviteData.name, inviteData.email, inviteData.role, inviteData.portalType, inviteData.companyName);
                  }
                  setIsInviteModalOpen(false);
                  setInviteData({ name: '', email: '', role: UserRole.STUDENT });
                }}
                className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl mt-4"
              >
                <Mail size={20} />
                Lähetä kutsu
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
