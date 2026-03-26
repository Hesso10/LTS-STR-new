import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Building2, Phone, Shield, Camera, Save, UserPlus, Trash2, X, Plus } from 'lucide-react';
import { UserAccount, UserRole, PortalType, Invite } from '../types';

interface ProfileProps {
  user: UserAccount;
  portalType: PortalType;
  invites?: Invite[];
  receivedInvites?: Invite[];
  onUpdate: (updates: Partial<UserAccount>) => void;
  teamMembers?: { name: string; email: string }[];
  onInviteTeamMember?: (name: string, email: string) => void;
  onInviteUser?: (name: string, email: string, role: UserRole) => void;
  onRemoveTeamMember?: (email: string) => void;
  viewingWorkspaceAs?: string | null;
  onSwitchWorkspace?: (uid: string | null) => void;
  onAcceptInvite?: (inviteId: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ 
  user, 
  portalType, 
  invites = [],
  receivedInvites = [],
  onUpdate,
  teamMembers,
  onInviteTeamMember,
  onInviteUser,
  onRemoveTeamMember,
  viewingWorkspaceAs,
  onSwitchWorkspace,
  onAcceptInvite
}) => {
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    companyName: user.companyName || '',
    email: user.email
  });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: UserRole.STUDENT });

  const isStrategy = portalType === PortalType.STRATEGY;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Henkilötiedot</h1>
          <p className="text-slate-400 font-medium">Hallitse profiiliasi ja yrityksesi tietoja.</p>
        </div>
        <button 
          onClick={() => onUpdate(formData)}
          className={`px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${isStrategy ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          <Save size={20} />
          Tallenna muutokset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-xl flex flex-col items-center text-center">
            <div className="relative mb-6 group">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-2xl ${isStrategy ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                {user.displayName.substring(0, 2).toUpperCase()}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full border border-black/5 shadow-lg flex items-center justify-center text-slate-400 hover:text-black transition-colors">
                <Camera size={18} />
              </button>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">{user.displayName}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{user.role}</p>
            <div className={`mt-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isStrategy ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {portalType} Jäsen
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Koko nimi</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sähköposti</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-400 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Yrityksen nimi</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                  placeholder="Yritys Oy"
                />
              </div>
            </div>

            {!isStrategy && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Puhelinnumero</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                      placeholder="+358..."
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Y-tunnus</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 outline-none transition-all font-medium"
                      placeholder="1234567-8"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {(user.role === UserRole.ADMIN || user.role === UserRole.TEACHER || user.canInviteTeamMembers) && (onInviteTeamMember || onInviteUser) && (
            <div className="bg-white p-10 rounded-[40px] border border-black/5 shadow-xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">Kutsut ja tiimi</h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {user.role === UserRole.ADMIN && (
                  <>
                    <button 
                      onClick={() => { setInviteData({ ...inviteData, role: UserRole.ADMIN }); setIsInviteModalOpen(true); }}
                      className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
                    >
                      <UserPlus size={16} />
                      Kutsu Admin
                    </button>
                    <button 
                      onClick={() => { setInviteData({ ...inviteData, role: UserRole.TEACHER }); setIsInviteModalOpen(true); }}
                      className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
                    >
                      <UserPlus size={16} />
                      Kutsu opettaja
                    </button>
                  </>
                )}
                
                {(user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) && (
                  <button 
                    onClick={() => { setInviteData({ ...inviteData, role: UserRole.STUDENT }); setIsInviteModalOpen(true); }}
                    className="bg-white text-black border border-black/5 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
                  >
                    <UserPlus size={16} />
                    Kutsu opiskelija
                  </button>
                )}

                {(user.role === UserRole.ADMIN || user.canInviteTeamMembers) && onInviteTeamMember && (
                  <button 
                    onClick={() => { setInviteData({ ...inviteData, role: UserRole.TEAM_MEMBER }); setIsInviteModalOpen(true); }}
                    className="bg-black text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg text-sm"
                  >
                    <Plus size={16} />
                    Kutsu tiimin jäsen
                  </button>
                )}
              </div>
              
              <div className="space-y-3 mt-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kutsutut henkilöt ja tiimi</h4>
                {teamMembers?.map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{member.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Tiimi</span>
                      <button 
                        onClick={() => onRemoveTeamMember && onRemoveTeamMember(member.email)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {invites.filter(inv => inv.invitedBy === user.uid && !inv.used && !teamMembers?.some(tm => tm.email === inv.email)).map((invite, i) => (
                  <div key={`inv-${i}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm border border-dashed border-slate-300">
                        {invite.displayName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold italic">{invite.displayName} (Odottaa)</p>
                        <p className="text-[10px] text-slate-400 font-medium">{invite.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{invite.role}</span>
                    </div>
                  </div>
                ))}
                {(!teamMembers || teamMembers.length === 0) && invites.filter(inv => inv.invitedBy === user.uid && !inv.used && !teamMembers?.some(tm => tm.email === inv.email)).length === 0 && (
                  <p className="text-center text-slate-300 font-medium italic py-4">Ei vielä kutsuttuja henkilöitä tai tiimin jäseniä.</p>
                )}
              </div>

              {receivedInvites.filter(inv => inv.role === UserRole.TEAM_MEMBER).length > 0 && (
                <div className="space-y-3 mt-8 pt-8 border-t border-black/5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Omat tiimit</h4>
                  <p className="text-sm text-slate-500 mb-4">Olet jäsenenä seuraavissa tiimeissä. Voit siirtyä tarkastelemaan heidän työtilaansa.</p>
                  
                  {/* Option to return to own workspace if currently viewing another */}
                  {viewingWorkspaceAs && (
                    <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                          {user.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-indigo-900">Oma työtila</p>
                          <p className="text-[10px] text-indigo-600 font-medium">Palaa omaan työtilaasi</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onSwitchWorkspace && onSwitchWorkspace(null)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors"
                      >
                        Palaa
                      </button>
                    </div>
                  )}

                  {receivedInvites.filter(inv => inv.role === UserRole.TEAM_MEMBER).map((invite, i) => (
                    <div key={`team-${i}`} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${viewingWorkspaceAs === invite.invitedBy ? 'bg-slate-800 text-white border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${viewingWorkspaceAs === invite.invitedBy ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          TI
                        </div>
                        <div>
                          <p className="text-sm font-bold">Tiimi (Kutsuja: {invite.invitedBy})</p>
                          <p className={`text-[10px] font-medium ${viewingWorkspaceAs === invite.invitedBy ? 'text-slate-400' : 'text-slate-500'}`}>
                            {invite.used ? 'Siirry tiimin työtilaan' : 'Odottaa hyväksyntää'}
                          </p>
                        </div>
                      </div>
                      {!invite.used ? (
                        <button 
                          onClick={() => onAcceptInvite && onAcceptInvite(invite.id)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md"
                        >
                          Hyväksy kutsu
                        </button>
                      ) : (
                        <>
                          {viewingWorkspaceAs !== invite.invitedBy && (
                            <button 
                              onClick={() => onSwitchWorkspace && onSwitchWorkspace(invite.invitedBy)}
                              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                            >
                              Siirry
                            </button>
                          )}
                          {viewingWorkspaceAs === invite.invitedBy && (
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              Aktiivinen
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
            <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">
              {inviteData.role === UserRole.TEAM_MEMBER ? 'Kutsu tiimin jäsen' : 'Kutsu käyttäjä'}
            </h2>
            <p className="text-slate-400 font-medium mb-8">
              Lähetä kutsu uudelle {
                inviteData.role === UserRole.TEACHER ? 'opettajalle' : 
                inviteData.role === UserRole.STUDENT ? 'opiskelijalle' :
                inviteData.role === UserRole.ADMIN ? 'adminille' :
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
              <button 
                onClick={() => {
                  if (inviteData.name && inviteData.email) {
                    if (inviteData.role === UserRole.TEAM_MEMBER && onInviteTeamMember) {
                      onInviteTeamMember(inviteData.name, inviteData.email);
                    } else if (onInviteUser) {
                      onInviteUser(inviteData.name, inviteData.email, inviteData.role);
                    }
                  }
                  setIsInviteModalOpen(false);
                  setInviteData({ name: '', email: '', role: UserRole.STUDENT });
                }}
                className={`w-full text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl mt-4 ${isStrategy ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
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
