import React, { useState, useEffect } from 'react';
import { Database, Github, Download, Upload, RefreshCw, CheckCircle2, CloudLightning, Zap, ShieldAlert } from 'lucide-react';
import { User, GithubConfig, AppSnapshot, APP_VERSION } from '../types.ts';
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
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'applying' | 'done'>('idle');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const toBase64 = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
  const fromBase64 = (str: string) => decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

  const handlePushToGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo.includes('/')) {
      alert("❌ Ошибка настроек GitHub");
      setShowAdvanced(true);
      return;
    }

    setSyncStatus('loading');
    try {
      const snapshot: AppSnapshot = { ...currentDb, timestamp: new Date().toISOString(), version: APP_VERSION };
      const contentBase64 = toBase64(JSON.stringify(snapshot, null, 2));
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      
      let sha = "";
      const getRes = await fetch(url, { headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` } });
      if (getRes.ok) {
        const existingFile = await getRes.json();
        sha = existingFile.sha;
      }

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Sync v${APP_VERSION} [${new Date().toLocaleDateString()}]`, content: contentBase64, sha: sha || undefined })
      });

      if (putRes.ok) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else { throw new Error("GitHub Error"); }
    } catch (e: any) {
      setSyncStatus('error');
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handlePullFromGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo.includes('/')) {
      alert("❌ Ошибка настроек GitHub");
      setShowAdvanced(true);
      return;
    }

    setSyncStatus('loading');
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` }, cache: 'no-store' });
      
      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(fromBase64(data.content));
        onDataImport(content);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else { setSyncStatus('error'); }
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const handleForceUpdate = async () => {
    if (!ghConfig.token) {
      alert("Необходим GitHub Token для обновления системы");
      return;
    }

    setUpdateStatus('checking');
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      setUpdateStatus('applying');
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` }, cache: 'no-store' });
      
      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(fromBase64(data.content)) as AppSnapshot;
        onDataImport(content);
        setUpdateStatus('done');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      } else {
        throw new Error("Не удалось получить данные для обновления");
      }
    } catch (e) {
      alert("Ошибка обновления: " + (e instanceof Error ? e.message : "Неизвестная ошибка"));
      setUpdateStatus('idle');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto border border-white/30 shadow-2xl">
            <Zap size={36} className={`${updateStatus !== 'idle' ? 'animate-pulse text-amber-300' : 'text-white'}`} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Синхронизация Системы</h2>
            <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] opacity-80">Принудительное обновление Enterprise Core</p>
          </div>
          <button 
            onClick={handleForceUpdate}
            disabled={updateStatus !== 'idle'}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${
              updateStatus === 'idle' ? 'bg-white text-blue-600 hover:bg-blue-50 active:scale-95' : 'bg-white/20 text-white cursor-wait'
            }`}
          >
            {updateStatus === 'idle' && <><RefreshCw size={18} /> ОБНОВИТЬ СЕЙЧАС</>}
            {updateStatus === 'checking' && <><RefreshCw size={18} className="animate-spin" /> ПРОВЕРКА...</>}
            {updateStatus === 'applying' && <><Database size={18} className="animate-bounce" /> ПРИМЕНЕНИЕ...</>}
            {updateStatus === 'done' && <><CheckCircle2 size={18} className="text-emerald-300" /> ГОТОВО</>}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-slate-100 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><Github size={24} /></div>
            <div className="text-left">
              <h2 className="text-lg font-black uppercase tracking-tight leading-none">Облачный Архив</h2>
              <span className="text-[8px] font-black uppercase tracking-widest mt-1 block text-blue-400">Ручное управление снимками</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button onClick={handlePullFromGithub} disabled={syncStatus === 'loading'} className="flex flex-col items-center gap-3 bg-white/5 py-6 rounded-3xl border border-white/10 active:scale-95 transition-all">
            <Download size={24} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">ИМПОРТ</span>
          </button>
          <button onClick={handlePushToGithub} disabled={syncStatus === 'loading'} className="flex flex-col items-center gap-3 bg-blue-600 py-6 rounded-3xl active:scale-95 transition-all shadow-xl">
            <Upload size={24} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest">ЭКСПОРТ</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm text-left">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CloudLightning size={14} /> GitHub Cloud Settings
          </h4>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[9px] font-black text-blue-600 uppercase">
            {showAdvanced ? 'Закрыть' : 'Настроить'}
          </button>
        </div>
        {showAdvanced && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Personal Access Token</label>
              <input type="password" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none" placeholder="ghp_..." />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Repository (user/repo)</label>
              <input type="text" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none" placeholder="user/repo" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};