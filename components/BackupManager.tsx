import React, { useState, useEffect } from 'react';
import { Database, Github, Download, Upload, RefreshCw, CheckCircle2, CloudLightning, Zap, ShieldAlert, Key } from 'lucide-react';
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

  // Надежные UTF-8 кодеры
  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    ));
  };

  const fromBase64 = (str: string) => {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  };

  const handlePushToGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo.includes('/')) {
      alert("⚠️ Настройте GitHub доступ внизу страницы");
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
        body: JSON.stringify({ 
          message: `Update Enterprise DB v${APP_VERSION} [${new Date().toLocaleString()}]`, 
          content: contentBase64, 
          sha: sha || undefined 
        })
      });

      if (putRes.ok) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else { throw new Error("GitHub rejected the request"); }
    } catch (e: any) {
      setSyncStatus('error');
      alert(`Ошибка экспорта: ${e.message}`);
    }
  };

  const handlePullFromGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo.includes('/')) {
      alert("⚠️ Настройте GitHub доступ");
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
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else { throw new Error("File not found or access denied"); }
    } catch (e: any) {
      setSyncStatus('error');
      alert(`Ошибка импорта: ${e.message}`);
    }
  };

  const handleForceUpdate = async () => {
    if (!ghConfig.token) {
      alert("Требуется Personal Access Token");
      setShowAdvanced(true);
      return;
    }

    setUpdateStatus('checking');
    try {
      setUpdateStatus('applying');
      await handlePullFromGithub();
      setUpdateStatus('done');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    } catch (e) {
      setUpdateStatus('idle');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      <div className="bg-gradient-to-br from-blue-700 via-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group text-center border-b-4 border-blue-900">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-3xl flex items-center justify-center mx-auto border border-white/20 shadow-2xl">
            <Zap size={36} className={updateStatus !== 'idle' ? 'animate-pulse text-amber-300' : 'text-white'} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Центральный Узел</h2>
            <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em] opacity-80">Сверхточная синхронизация данных</p>
          </div>
          <button 
            onClick={handleForceUpdate}
            disabled={updateStatus !== 'idle'}
            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${
              updateStatus === 'idle' ? 'bg-white text-blue-700 hover:scale-105 active:scale-95' : 'bg-white/20 text-white cursor-wait'
            }`}
          >
            {updateStatus === 'idle' ? <><RefreshCw size={18} /> ПРОВЕРИТЬ ОБНОВЛЕНИЯ</> : <><RefreshCw size={18} className="animate-spin" /> В ПРОЦЕССЕ...</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={handlePullFromGithub} 
          disabled={syncStatus === 'loading'} 
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-4 active:scale-95 transition-all group hover:border-blue-400"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Download size={24} />
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Импорт</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">Загрузить из облака</span>
          </div>
        </button>

        <button 
          onClick={handlePushToGithub} 
          disabled={syncStatus === 'loading'} 
          className="bg-slate-900 p-6 rounded-3xl flex flex-col items-center gap-4 active:scale-95 transition-all group hover:bg-blue-600"
        >
          <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
            <Upload size={24} />
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black text-white uppercase tracking-widest block mb-1">Экспорт</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">Сохранить в облако</span>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
              <Key size={20} />
            </div>
            <div>
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Параметры доступа</h4>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">GitHub API Integration</p>
            </div>
          </div>
          <RefreshCw size={16} className={`text-slate-300 transition-transform duration-500 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">GitHub Token</label>
              <input 
                type="password" 
                value={ghConfig.token} 
                onChange={e => setGhConfig({...ghConfig, token: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[12px] font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                placeholder="ghp_xxxxxxxxxxxx" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Repository (owner/repo)</label>
              <input 
                type="text" 
                value={ghConfig.repo} 
                onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[12px] font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                placeholder="myuser/zodchiy-db" 
              />
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
              <ShieldAlert size={18} className="text-amber-600 shrink-0" />
              <p className="text-[9px] font-bold text-amber-800 leading-relaxed uppercase">
                Никогда не передавайте свой токен третьим лицам. Он хранится только в локальной памяти вашего устройства.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};