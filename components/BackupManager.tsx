import React, { useState, useEffect } from 'react';
import { Database, Github, Download, Upload, RefreshCw, CheckCircle2, CloudLightning, Zap, ShieldAlert, Key, AlertTriangle, ShieldCheck, Search, Activity, Terminal } from 'lucide-react';
import { User, GithubConfig, AppSnapshot, APP_VERSION } from '../types.ts';
import { STORAGE_KEYS } from '../App.tsx';

interface BackupManagerProps {
  currentUser?: User | null;
  currentDb: AppSnapshot;
  onDataImport: (data: AppSnapshot) => void;
}

type DiagnosticStep = {
  id: string;
  label: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
};

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

  // Диагностика
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagSteps, setDiagSteps] = useState<DiagnosticStep[]>([
    { id: 'token', label: 'Проверка Токена', status: 'idle' },
    { id: 'repo', label: 'Поиск Репозитория', status: 'idle' },
    { id: 'write', label: 'Права на запись', status: 'idle' }
  ]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    ));
  };

  const fromBase64 = (str: string) => {
    try {
      return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch (e) {
      console.error("Decoding error", e);
      return str;
    }
  };

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagSteps(prev => prev.map(s => ({ ...s, status: 'idle', message: undefined })));
    setLastError(null);

    const updateStep = (id: string, update: Partial<DiagnosticStep>) => {
      setDiagSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
    };

    try {
      // Step 1: Token
      updateStep('token', { status: 'running' });
      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` }
      });
      if (!userRes.ok) throw { step: 'token', msg: 'Токен невалиден или просрочен (401)' };
      const userData = await userRes.json();
      updateStep('token', { status: 'success', message: `Ок: ${userData.login}` });

      // Step 2: Repo
      updateStep('repo', { status: 'running' });
      const repoRes = await fetch(`https://api.github.com/repos/${ghConfig.repo}`, {
        headers: { 
          'Authorization': `Bearer ${ghConfig.token.trim()}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (!repoRes.ok) {
        if (repoRes.status === 404) throw { step: 'repo', msg: 'Репозиторий не найден. Убедитесь, что формат "user/repo" и репозиторий создан на GitHub.' };
        throw { step: 'repo', msg: `Ошибка репозитория: ${repoRes.status}` };
      }
      const repoData = await repoRes.json();
      updateStep('repo', { status: 'success', message: `Найдено: ${repoData.private ? 'Приватный' : 'Публичный'}` });

      // Step 3: Write access
      updateStep('write', { status: 'running' });
      const scopes = userRes.headers.get('x-oauth-scopes');
      if (scopes && !scopes.includes('repo')) {
        updateStep('write', { status: 'error', message: 'Токен без прав "repo". Экспорт невозможен.' });
      } else {
        updateStep('write', { status: 'success', message: 'Полный доступ подтвержден' });
      }

    } catch (e: any) {
      if (e.step) updateStep(e.step, { status: 'error', message: e.msg });
      setLastError(e.msg || 'Неизвестная ошибка диагностики');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handlePushToGithub = async () => {
    setLastError(null);
    if (!ghConfig.token || !ghConfig.repo.includes('/')) {
      alert("⚠️ Настройте GitHub (owner/repo)");
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
        body: JSON.stringify({ 
          message: `Zodchiy Sync v${APP_VERSION}`, 
          content, 
          sha: sha || undefined 
        })
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
        onDataImport(JSON.parse(fromBase64(data.content)));
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
            <h2 className="text-xl font-black uppercase tracking-tighter">Синхронизация Облака</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Версия протокола v1.3.0</p>
          </div>
        </div>
      </div>

      {lastError && (
        <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex items-start gap-4">
          <AlertTriangle className="text-rose-600 shrink-0" size={24} />
          <div>
            <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Ошибка связи</h4>
            <p className="text-xs font-bold text-rose-600 mt-1">{lastError}</p>
            <button onClick={runDiagnostic} className="mt-3 text-[9px] font-black text-white bg-rose-600 px-3 py-1.5 rounded-lg uppercase">Запустить диагностику</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Terminal size={14} /> Результаты тестов
          </h3>
          {isDiagnosing && <RefreshCw size={14} className="animate-spin text-blue-600" />}
        </div>
        
        <div className="space-y-3">
          {diagSteps.map(step => (
            <div key={step.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  step.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                  step.status === 'error' ? 'bg-rose-500 animate-pulse' :
                  step.status === 'running' ? 'bg-blue-500 animate-bounce' : 'bg-slate-300'
                }`}></div>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{step.label}</span>
              </div>
              <span className={`text-[9px] font-bold uppercase truncate max-w-[150px] ${step.status === 'error' ? 'text-rose-600' : 'text-slate-400'}`}>
                {step.message || (step.status === 'idle' ? 'Ожидание' : step.status === 'running' ? 'Проверка...' : '')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handlePullFromGithub}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all group"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Download size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">Импорт</span>
        </button>

        <button 
          onClick={handlePushToGithub}
          className="bg-slate-900 p-6 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all group"
        >
          <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-all">
            <Upload size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-white">Экспорт</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Key size={18} /></div>
            <div className="text-left">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Настройки GitHub</h4>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Личные ключи доступа</p>
            </div>
          </div>
          <RefreshCw size={14} className={`text-slate-300 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Персональный токен (repo scope)</label>
              <input 
                type="password" 
                value={ghConfig.token}
                onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                placeholder="ghp_xxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Репозиторий (username/repo-name)</label>
              <input 
                type="text" 
                value={ghConfig.repo}
                onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                placeholder="ivanov/zodchiy-data"
              />
            </div>
            <button 
              onClick={runDiagnostic}
              disabled={isDiagnosing}
              className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} /> Тест Соединения
            </button>
          </div>
        )}
      </div>
    </div>
  );
};