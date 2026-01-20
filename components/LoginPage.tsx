
import React, { useState } from 'react';
import { User as UserIcon, Lock, AlertCircle, ArrowRight, Info, RefreshCw, Building2 } from 'lucide-react';
import { User, UserRole, ROLE_LABELS } from '../types.ts';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Очищаем пробелы для надежности
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = users.find(u => 
      u.username.toLowerCase().trim() === cleanUsername && 
      (u.password === cleanPassword || (!u.password && cleanPassword === '123'))
    );

    if (user) {
      onLogin(user);
    } else {
      setError('Неверное имя пользователя или пароль');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Вы уверены, что хотите сбросить все локальные данные? Это удалит проекты и задачи, созданные в демо-режиме.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Декоративные элементы фона */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700 flex flex-col items-center">
          <div className="bg-white/10 backdrop-blur-lg p-5 rounded-[2.5rem] shadow-2xl mb-6 border border-white/10">
            <Building2 size={60} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            ЗОДЧИЙ <span className="text-blue-500">Projects</span>
          </h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em] mt-2">
            Construction Management System
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
          <h2 className="text-xl font-black text-slate-800 mb-6 tracking-tight">Вход в систему</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Логин</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder="админ"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all font-bold text-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  required
                  type="password"
                  placeholder="123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all font-bold text-slate-700 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3.5 rounded-xl animate-in shake duration-300 border border-rose-100">
                <AlertCircle size={16} />
                <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all mt-2"
            >
              Войти в систему
              <ArrowRight size={16} strokeWidth={3} />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50">
            <button 
              onClick={() => setShowHints(!showHints)}
              className="flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-widest mx-auto"
            >
              <Info size={14} />
              {showHints ? 'Скрыть подсказки' : 'Демо-аккаунты'}
            </button>

            {showHints && (
              <div className="mt-4 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-200">
                {users.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => { setUsername(u.username); setPassword('123'); }}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all"
                  >
                    <span className="text-[10px] font-bold text-slate-700">{u.username}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{ROLE_LABELS[u.role]}</span>
                  </button>
                ))}
                <p className="text-[8px] text-center text-slate-300 font-bold uppercase mt-2">Пароль для всех: 123</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleResetData}
          className="mt-8 flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-widest mx-auto hover:text-white/60 transition-colors"
        >
          <RefreshCw size={12} />
          Сбросить все данные приложения
        </button>
      </div>
    </div>
  );
};
