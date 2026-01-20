
import React, { useState, useEffect } from 'react';
import { Database, Download, Trash2, Clock, CheckCircle, AlertCircle, Github, Save, Settings2, Globe, Lock, RefreshCw as RefreshIcon } from 'lucide-react';
import { BackupEntry, User, GithubConfig } from '../types.ts';

const STORAGE_KEY = 'stroy_sync_backups_v4';
const GH_CONFIG_KEY = 'stroy_sync_gh_config_v4';

const INITIAL_BACKUPS: BackupEntry[] = [
  { id: '1', createdAt: '20.05.2024, 14:30:12', size: '2.4 MB', status: 'success', createdBy: 'админ' },
];

interface BackupManagerProps {
  currentUser?: User | null;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser }) => {
  const [backups, setBackups] = useState<BackupEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_BACKUPS;
    } catch { return INITIAL_BACKUPS; }
  });

  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem(GH_CONFIG_KEY);
      return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'zodchiy_backup.json' };
    } catch { return { token: '', repo: '', path: 'zodchiy_backup.json' }; }
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showGhSettings, setShowGhSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
  }, [backups]);

  useEffect(() => {
    localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const createBackup = () => {
    setIsCreating(true);
    setTimeout(() => {
      const newBackup: BackupEntry = {
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toLocaleString('ru-RU'),
        size: (Math.random() * 5 + 1).toFixed(1) + ' MB',
        status: 'success',
        createdBy: currentUser?.username || 'Ручной',
      };
      setBackups(prev => [newBackup, ...prev]);
      setIsCreating(false);
    }, 1500);
  };

  // Modern robust base64 for Unicode
  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  };

  const handleSaveToGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Пожалуйста, заполните настройки GitHub (Токен и Репозиторий)");
      setShowGhSettings(true);
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const appData = {
        projects: JSON.parse(localStorage.getItem('stroy_sync_projects_v4') || '[]'),
        tasks: JSON.parse(localStorage.getItem('stroy_sync_tasks_v4') || '[]'),
        users: JSON.parse(localStorage.getItem('stroy_sync_users_v4') || '[]'),
        timestamp: new Date().toISOString(),
        version: "4.0.0"
      };

      const content = toBase64(JSON.stringify(appData, null, 2));
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const headers = { 
        'Authorization': `Bearer ${ghConfig.token.trim()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      };
      
      let sha = '';
      const getFile = await fetch(url, { headers });

      if (getFile.ok) {
        const fileData = await getFile.json();
        sha = fileData.sha;
      } else if (getFile.status !== 404) {
        const err = await getFile.json();
        throw new Error(`Ошибка доступа к репозиторию: ${err.message || getFile.statusText}`);
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Backup from Zodchiy App: ${new Date().toLocaleString()}`,
          content: content,
          sha: sha || undefined
        })
      });

      if (response.ok) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось сохранить файл');
      }
    } catch (error: any) {
      console.error("Github Backup Error:", error);
      setSyncStatus('error');
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteBackup = (id: string) => {
    if (window.confirm('Удалить эту копию?')) {
      setBackups(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 px-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Облачный бэкап</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">GitHub Integration Enabled</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setShowGhSettings(!showGhSettings)}
            className={`p-4 rounded-2xl border transition-all ${showGhSettings ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            <Settings2 size={20} />
          </button>
          <button 
            onClick={createBackup}
            disabled={isCreating}
            className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 shadow-sm active:scale-95 transition-all"
          >
            {isCreating ? <Clock size={16} className="animate-spin" /> : <Database size={16} />}
            Локально
          </button>
          <button 
            onClick={handleSaveToGithub}
            disabled={isSyncing}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-100 active:scale-95 ${
              syncStatus === 'success' ? 'bg-emerald-500 text-white' : 
              syncStatus === 'error' ? 'bg-rose-500 text-white' : 
              'bg-blue-600 text-white'
            }`}
          >
            {isSyncing ? <RefreshIcon size={16} className="animate-spin" /> : <Github size={16} />}
            {syncStatus === 'success' ? 'Успешно!' : isSyncing ? 'Синхрон...' : 'В GitHub'}
          </button>
        </div>
      </div>

      {showGhSettings && (
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-2">
            <Github size={20} className="text-blue-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Настройки GitHub API</h3>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="password" 
                placeholder="Personal Access Token (classic or fine-grained)" 
                value={ghConfig.token}
                onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="User / Repository (e.g. ivan/stroy-data)" 
                value={ghConfig.repo}
                onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter px-1">
              * Данные сохраняются только в вашем браузере. Рекомендуется создать токен с правами 'repo' или доступом к контенту.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Локальный журнал</span>
          <span className="text-[10px] font-black text-slate-400 uppercase">{backups.length} копий</span>
        </div>
        
        <div className="divide-y divide-slate-50">
          {backups.map((b) => (
            <div key={b.id} className="p-6 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle size={22} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm leading-none mb-1.5">{b.createdAt}</h4>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded-md">
                    {b.size} • {b.createdBy}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => deleteBackup(b.id)}
                  className="p-3 text-slate-300 hover:text-rose-600 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
