
import React, { useState, useEffect } from 'react';
import { Database, Github, Settings2, Globe, Lock, CloudDownload, CloudUpload, Copy, Key, Check, AlertCircle, RefreshCw, ShieldCheck, ShieldAlert, Share2, QrCode, ExternalLink, X } from 'lucide-react';
import { User, GithubConfig } from '../types.ts';
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
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
    if (ghConfig.token && ghConfig.repo) {
       setSyncStatus('idle');
    }
  }, [ghConfig]);

  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  };

  const fromBase64 = (str: string) => {
    try {
      const cleanStr = str.replace(/\s/g, '');
      return decodeURIComponent(Array.prototype.map.call(atob(cleanStr), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) { 
      return ''; 
    }
  };

  const generateInviteLink = () => {
    const configStr = JSON.stringify(ghConfig);
    const base64 = btoa(configStr);
    const url = new URL(window.location.origin);
    url.searchParams.set('config', base64);
    return url.toString();
  };

  const handleShareLink = () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Сначала настройте подключение в расширенных настройках");
      setShowAdvanced(true);
      return;
    }
    const link = generateInviteLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert("Ссылка-приглашение скопирована! Отправьте её коллеге.");
  };

  const testConnection = async () => {
    if (!ghConfig.token || !ghConfig.repo) return;
    setSyncStatus('testing');
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` }
      });
      setSyncStatus(response.ok ? 'valid' : 'invalid');
    } catch {
      setSyncStatus('invalid');
    }
  };

  const handlePullFromGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) return;
    setIsSyncing(true);
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${ghConfig.token.trim()}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = fromBase64(data.content);
        if (!rawContent) throw new Error("Ошибка чтения данных");
        const content = JSON.parse(rawContent);
        if (onDataImport) {
          onDataImport(content);
          setSyncStatus('valid');
          alert("Данные успешно синхронизированы!");
        }
      } else {
        throw new Error(response.status === 404 ? "Файл не найден" : "Ошибка доступа");
      }
    } catch (error: any) {
      alert(`Синхронизация не удалась: ${error.message}`);
      setSyncStatus('invalid');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveToGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) return;
    setIsSyncing(true);
    try {
      const appData = {
        projects: JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]'),
        tasks: JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'),
        users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
        timestamp: new Date().toISOString(),
      };

      const content = toBase64(JSON.stringify(appData, null, 2));
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const headers = { 
        'Authorization': `Bearer ${ghConfig.token.trim()}`, 
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      };
      
      let sha = '';
      const getFile = await fetch(url, { headers, cache: 'no-store' });
      if (getFile.ok) {
        const fileData = await getFile.json();
        sha = fileData.sha;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Update from Zodchiy Mobile [${new Date().toLocaleString()}]`,
          content,
          sha: sha || undefined
        })
      });

      if (response.ok) {
        setSyncStatus('valid');
        alert("Облако обновлено!");
      } else {
        const err = await response.json();
        throw new Error(err.message);
      }
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
      setSyncStatus('invalid');
    } finally {
      setIsSyncing(false);
    }
  };

  const openQR = () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Сначала настройте подключение в расширенных настройках");
      setShowAdvanced(true);
      return;
    }
    setShowQRModal(true);
  };

  return (
    <div className="space-y-4 pb-24 px-1 animate-in fade-in relative">
      <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-white/5">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl">
                <Database size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight leading-none">Облако</h2>
                <div className="flex items-center gap-1.5 mt-1">
                   {syncStatus === 'valid' ? (
                     <span className="flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-widest"><ShieldCheck size={10}/> Активно</span>
                   ) : (
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Готов к работе</span>
                   )}
                </div>
              </div>
            </div>
            {ghConfig.token && (
              <button onClick={testConnection} className="p-2 bg-white/5 rounded-lg text-slate-400 active:rotate-180 transition-all">
                <RefreshCw size={16} className={syncStatus === 'testing' ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button 
                onClick={handlePullFromGithub}
                disabled={isSyncing}
                className="flex-1 bg-white/5 backdrop-blur-md text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all"
              >
                <CloudDownload size={18} /> Загрузить
              </button>
              <button 
                onClick={handleSaveToGithub}
                disabled={isSyncing}
                className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                <CloudUpload size={18} /> Сохранить
              </button>
            </div>
            
            <button 
              onClick={handleShareLink}
              className="w-full bg-slate-700/50 text-white/80 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-white/5 active:scale-95 transition-all"
            >
              <Share2 size={16} /> {copied ? 'Ссылка скопирована' : 'Поделиться доступом с командой'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Settings2 size={12} /> Конфигурация
          </h4>
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[9px] font-black text-blue-600 uppercase"
          >
            {showAdvanced ? 'Скрыть' : 'Настроить вручную'}
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-3 animate-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">GitHub Token (Classic)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                <input 
                  type="password" 
                  value={ghConfig.token}
                  onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg py-3 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="ghp_..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Репозиторий (user/repo)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                <input 
                  type="text" 
                  value={ghConfig.repo}
                  onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg py-3 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="ivanov/my-zodchiy-data"
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3">
          <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
          <p className="text-[10px] font-bold text-emerald-900 leading-normal">
            <b>Мастер-настройка:</b> Настройте GitHub один раз, а затем покажите QR-код коллеге для автоматического подключения.
          </p>
        </div>
      </div>
      
      <button 
        onClick={openQR}
        className="p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 flex items-center justify-between active:scale-95 transition-all w-full shadow-xl"
      >
         <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <QrCode size={20} className="text-white" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">Показать QR для прорабов</span>
         </div>
         <ExternalLink size={18} className="text-slate-500" />
      </button>

      {/* Модальное окно QR-кода */}
      {showQRModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center relative shadow-2xl animate-in zoom-in-95">
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 rounded-full hover:text-slate-800 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="mb-6 mt-4">
               <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-xl mb-4">
                  <QrCode size={32} />
               </div>
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Быстрый доступ</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Отсканируйте код другим телефоном</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border-2 border-slate-50 shadow-inner inline-block mb-6">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generateInviteLink())}`} 
                 alt="QR Code" 
                 className="w-56 h-56 rounded-xl"
               />
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl text-blue-700 text-[10px] font-bold leading-relaxed">
               Код содержит настройки вашего облака. При сканировании приложение на другом устройстве настроится автоматически.
            </div>

            <button 
              onClick={() => setShowQRModal(false)}
              className="w-full mt-6 bg-slate-800 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
