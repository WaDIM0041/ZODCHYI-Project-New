import React, { useState, useEffect } from 'react';
import { Database, Github, Download, Upload, RefreshCw, CheckCircle2, CloudLightning, Zap, ShieldAlert, Key, AlertTriangle, ShieldCheck, Search, Activity, Terminal, Share2, ClipboardCheck, Copy, Users } from 'lucide-react';
import { User, GithubConfig, AppSnapshot, APP_VERSION, UserRole, ROLE_LABELS, InvitePayload } from '../types.ts';
import { STORAGE_KEYS } from '../App.tsx';

interface BackupManagerProps {
  currentUser?: User | null;
  currentDb: AppSnapshot;
  onDataImport: (data: AppSnapshot) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser, currentDb, onDataImport }) => {
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'zodchiy_db.json' };
    } catch { return { token: '', repo: '', path: 'zodchiy_db.json' }; }
  });
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Новое: выбор роли для инвайт-кода
  const [selectedInviteRole, setSelectedInviteRole] = useState<UserRole>(UserRole.FOREMAN);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    ));
  };

  const generateInviteCode = () => {
    const payload: InvitePayload = {
      token: ghConfig.token,
      repo: ghConfig.repo,
      path: ghConfig.path,
      role: selectedInviteRole,
      username: currentUser?.username || 'Admin'
    };
    const code = toBase64(JSON.stringify(payload));
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushToGithub = async () => {
    setLastError(null);
    if (!ghConfig.token || !ghConfig.repo.includes('/')) {
      alert("⚠️ Сначала настройте GitHub внизу страницы");
      setShowAdvanced(true);
      return;
    }

    setSyncStatus('loading');
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const headers = {
        'Authorization': `Bearer ${ghConfig.token.trim()}`,
        'Accept': 'application/vnd.github+json'
      };

      let sha = "";
      const getRes = await fetch(url, { headers, cache: 'no-store' });
      if (getRes.ok) {
        const file = await getRes.json();
        sha = file.sha;
      }

      const snapshot: AppSnapshot = { ...currentDb, timestamp: new Date().toISOString(), version: APP_VERSION };
      const content = toBase64(JSON.stringify(snapshot, null, 2));

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Sync v${APP_VERSION}`, content, sha: sha || undefined })
      });

      if (putRes.ok) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        const errorData = await putRes.json();
        throw new Error(errorData.message || 'Ошибка записи');
      }
    } catch (e: any) {
      setSyncStatus('error');
      setLastError(e.message);
    }
  };

  const handlePullFromGithub = async () => {
    setLastError(null);
    setSyncStatus('loading');
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const rawContent = data.content.replace(/\s/g, '');
        // Helper to handle both standard atob and URL-safe base64 if needed
        const decoded = decodeURIComponent(Array.prototype.map.call(atob(rawContent), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        onDataImport(JSON.parse(decoded));
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        throw new Error(`Ошибка загрузки: ${res.status}`);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setLastError(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16 text-left">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
            <CloudLightning size={32} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Синхронизация</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Protocol v{APP_VERSION}</p>
          </div>
        </div>
      </div>

      {/* НОВАЯ СЕКЦИЯ: ГЕНЕРАЦИЯ КЛЮЧА ПРИГЛАШЕНИЯ */}
      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Share2 size={18} /></div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Создать приглашение</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
            Выберите роль, которую получит сотрудник при входе по этому ключу:
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
              const role = roleKey as UserRole;
              if (role === UserRole.ADMIN) return null; // Админы создаются только вручную
              return (
                <button
                  key={role}
                  onClick={() => setSelectedInviteRole(role)}
                  className={`p-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                    selectedInviteRole === role 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                    : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button 
            onClick={generateInviteCode}
            disabled={!ghConfig.token}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
              copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white shadow-slate-200'
            } disabled:opacity-50`}
          >
            {copied ? <ClipboardCheck size={20} /> : <Copy size={20} />}
            {copied ? 'Ключ скопирован!' : 'Создать и копировать ключ'}
          </button>
          {!ghConfig.token && <p className="text-[8px] text-rose-500 font-bold text-center uppercase">Сначала настройте GitHub ниже</p>}
        </div>
      </div>

      {lastError && (
        <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex items-start gap-4 animate-in shake duration-300">
          <AlertTriangle className="text-rose-600 shrink-0" size={24} />
          <div>
            <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Ошибка связи</h4>
            <p className="text-xs font-bold text-rose-600 mt-1">{lastError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handlePullFromGithub}
          disabled={syncStatus === 'loading'}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all group disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
            {syncStatus === 'loading' ? <RefreshCw className="animate-spin" size={22} /> : <Download size={22} />}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">Импорт базы</span>
        </button>

        <button 
          onClick={handlePushToGithub}
          disabled={syncStatus === 'loading'}
          className="bg-slate-900 p-6 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all group disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-all">
            {syncStatus === 'loading' ? <RefreshCw className="animate-spin" size={22} /> : <Upload size={22} />}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-white">Экспорт изменений</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Key size={18} /></div>
            <div className="text-left">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Системные настройки</h4>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Ключи GitHub (Только для Админа)</p>
            </div>
          </div>
          <RefreshCw size={14} className={`text-slate-300 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">GitHub Token</label>
              <input 
                type="password" 
                value={ghConfig.token}
                onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                placeholder="ghp_..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Repository (user/repo)</label>
              <input 
                type="text" 
                value={ghConfig.repo}
                onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none" 
                placeholder="ivanov/zodchiy-cloud"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">JSON Path</label>
              <input 
                type="text" 
                value={ghConfig.path}
                onChange={e => setGhConfig({...ghConfig, path: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none" 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};