import React, { useState } from 'react';
import { Shield, Activity, Users, Eye, Building2, ChevronRight, Key, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { User, UserRole, ROLE_LABELS, APP_VERSION } from '../types.ts';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  onApplyInvite: (code: string) => boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, onApplyInvite }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleApply = () => {
    if (!inviteCode.trim()) return;
    const success = onApplyInvite(inviteCode.trim());
    if (success) {
      setInviteStatus('success');
    } else {
      setInviteStatus('error');
      setTimeout(() => setInviteStatus('idle'), 3000);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield size={28} className="sm:w-8 sm:h-8" />;
      case UserRole.MANAGER: return <Activity size={28} className="sm:w-8 sm:h-8" />;
      case UserRole.FOREMAN: return <Users size={28} className="sm:w-8 sm:h-8" />;
      case UserRole.SUPERVISOR: return <Eye size={28} className="sm:w-8 sm:h-8" />;
    }
  };

  const getRoleTheme = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'from-amber-500 to-orange-600 shadow-amber-200/50';
      case UserRole.MANAGER: return 'from-indigo-500 to-purple-600 shadow-indigo-200/50';
      case UserRole.FOREMAN: return 'from-blue-500 to-cyan-600 shadow-blue-200/50';
      case UserRole.SUPERVISOR: return 'from-emerald-500 to-teal-600 shadow-emerald-200/50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full blur-[140px]"></div>
      </div>

      <div className="w-full max-w-lg z-10 space-y-8">
        <div className="text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex bg-white/10 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl mb-6 border border-white/10">
            <Building2 size={48} className="text-slate-200" />
          </div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter leading-none">
            ЗОДЧИЙ <span className="text-blue-500">CORE</span>
          </h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mt-2">
            Enterprise Construction
          </p>
        </div>

        {/* Секция активации по ключу */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-500 delay-100">
           <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl"><Zap size={18} /></div>
             <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Активация по ключу</h3>
           </div>
           
           <div className="flex gap-2">
             <div className="relative flex-1">
               <input 
                 type="text" 
                 value={inviteCode}
                 onChange={(e) => setInviteCode(e.target.value)}
                 placeholder="Вставьте ваш ключ..."
                 className={`w-full bg-white/10 border ${inviteStatus === 'error' ? 'border-rose-500 shadow-rose-500/20' : 'border-white/20'} rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none placeholder:text-white/30 transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10`}
               />
               {inviteStatus === 'success' && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />}
               {inviteStatus === 'error' && <AlertTriangle className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400" size={18} />}
             </div>
             <button 
               onClick={handleApply}
               disabled={!inviteCode.trim()}
               className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
             >
               Активировать
             </button>
           </div>
           {inviteStatus === 'error' && <p className="text-[9px] font-bold text-rose-400 mt-2 uppercase text-center tracking-widest">Недействительный ключ доступа</p>}
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          <div className="flex items-center gap-4 px-2">
            <div className="h-[1px] flex-1 bg-white/10"></div>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em]">Или выберите роль</p>
            <div className="h-[1px] flex-1 bg-white/10"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-2.5">
            {users.map((user) => (
              <button 
                key={user.id}
                onClick={() => onLogin(user)}
                className="group relative flex items-center gap-4 p-1 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] text-left overflow-hidden"
              >
                <div className={`w-16 h-16 rounded-[1.8rem] bg-gradient-to-br ${getRoleTheme(user.role)} flex items-center justify-center text-slate-100 shadow-xl transition-transform group-hover:scale-105 shrink-0`}>
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base font-black text-slate-100 leading-none mb-1 truncate">{user.username}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{ROLE_LABELS[user.role]}</p>
                </div>
                <div className="pr-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  <ChevronRight className="text-slate-100/30" size={20} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-8 text-center border-t border-white/5">
           <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Zodchiy Standard v{APP_VERSION} • Stable Build</p>
        </div>
      </div>
    </div>
  );
};