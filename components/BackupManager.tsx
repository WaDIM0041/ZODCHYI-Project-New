
import React, { useState, useEffect } from 'react';
import { Database, Github, Settings2, Globe, Lock, CloudDownload, CloudUpload, Copy, Key, Check, AlertCircle, RefreshCw, ShieldCheck, ShieldAlert, Share2, QrCode, ExternalLink, X, Info, Download, Upload, ArrowRightLeft, Package } from 'lucide-react';
import { User, GithubConfig, APP_VERSION, AppSnapshot } from '../types.ts';
import { STORAGE_KEYS } from '../App.tsx';

interface BackupManagerProps {
  currentUser?: User | null;
  onDataImport?: (data: any) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser, onDataImport }) => {
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'zodchiy_backup.json' };
    } catch { return { token: '', repo: '', path: 'zodchiy_backup.json' }; }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const createSnapshot = () => {
    const snapshot: AppSnapshot = {
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      projects: JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]'),
      tasks: JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'),
      users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
      config: ghConfig
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZODCHIЙ_ARCHIVE_v${APP_VERSION}_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert("Архив данных успешно создан и загружен!");
  };

  const handlePullFromGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) return;
    setIsSyncing(true);
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${ghConfig.token.trim()}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(atob(data.content));
        if (onDataImport) onDataImport(content);
        alert("Данные из облака успешно загружены!");
      }
    } catch (e) { alert("Ошибка загрузки"); } finally { setIsSyncing(false); }
  };

  return (
    <div className="space-y-4 pb-24 px-1 animate-in fade-in">
      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-slate-100 shadow-2xl border border-white/5 overflow-hidden relative">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Database size={24} className="text-slate-100" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight leading-none text-slate-100">Облако v{APP_VERSION}</h2>
              <span className="text-[9px] font-black uppercase tracking-widest mt-1 block text-emerald-400">Синхронизация активна</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button onClick={handlePullFromGithub} className="flex flex-col items-center gap-3 bg-white/5 py-6 rounded-3xl border border-white/10 transition-all active:scale-95">
            <Download size={24} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">Загрузить</span>
          </button>
          <button className="flex flex-col items-center gap-3 bg-blue-600 py-6 rounded-3xl transition-all active:scale-95">
            <Upload size={24} className="text-slate-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">Сохранить</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Безопасность и Архивация</h4>
        <button 
          onClick={createSnapshot}
          className="w-full flex items-center justify-between p-5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <Package size={20} />
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-widest block">Создать снапшот (Архив)</span>
              <span className="text-[8px] font-bold opacity-60 uppercase">Все данные в одном файле для отката</span>
            </div>
          </div>
          <Download size={18} />
        </button>
      </div>
      
      {/* GitHub Settings (Advanced) */}
      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Github size={14} /> GitHub Sync
          </h4>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[9px] font-black text-blue-600 uppercase">
            {showAdvanced ? 'Скрыть' : 'Настроить'}
          </button>
        </div>
        {showAdvanced && (
          <div className="space-y-4">
            <input 
              type="password" 
              value={ghConfig.token}
              onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none"
              placeholder="Personal Access Token"
            />
            <input 
              type="text" 
              value={ghConfig.repo}
              onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none"
              placeholder="Username/Repository"
            />
          </div>
        )}
      </div>
    </div>
  );
};
