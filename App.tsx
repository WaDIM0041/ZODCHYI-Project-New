import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  UserRole, Task, TaskStatus, Project, User, ProjectStatus, 
  ROLE_LABELS, APP_VERSION, AppNotification, GlobalChatMessage, AppSnapshot, FileCategory, GithubConfig, InvitePayload 
} from './types.ts';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectView } from './components/ProjectView.tsx';
import { ProjectForm } from './components/ProjectForm.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { NotificationCenter } from './components/NotificationCenter.tsx';
import { GlobalChat } from './components/GlobalChat.tsx';
import { Logo } from './components/Logo.tsx';
import { 
  LayoutGrid, 
  UserCircle, 
  LogOut,
  CheckSquare,
  RefreshCw,
  Bell,
  MessageSquare,
  Cloud,
  Wifi,
  Zap,
  ArrowDownCircle
} from 'lucide-react';

export const STORAGE_KEYS = {
  MASTER_STATE: `zod_master_v1.5.6`,
  AUTH_USER: `zod_auth_v1.5.6`,
  GH_CONFIG: `zod_gh_v1.5.6`
};

const toBase64 = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))));
const fromBase64 = (str: string) => {
  try { return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')); }
  catch (e) { return str; }
};

const generateUID = (p: string = 'id') => `${p}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Объект "Елизово-Холл"',
    clientFullName: 'Александров А.А.',
    city: 'Елизово',
    street: 'Магистральная, 42',
    phone: '+7 900 123-45-67',
    telegram: 'yelizovo_pro',
    address: 'г. Елизово, ул. Магистральная, 42',
    geoLocation: { lat: 53.1873, lon: 158.3905 },
    fileLinks: [],
    progress: 45,
    status: ProjectStatus.IN_PROGRESS,
    comments: [],
    updatedAt: new Date().toISOString()
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const syncLockRef = useRef(false);
  const lastCloudTimeRef = useRef<number>(0);

  const [db, setDb] = useState<AppSnapshot>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MASTER_STATE);
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.version === APP_VERSION) return parsed;
      return {
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        projects: parsed?.projects || INITIAL_PROJECTS,
        tasks: parsed?.tasks || [],
        users: parsed?.users || [
          { id: 1, username: 'Администратор', role: UserRole.ADMIN, password: '123' },
          { id: 2, username: 'Прораб', role: UserRole.FOREMAN, password: '123' },
          { id: 3, username: 'Технадзор', role: UserRole.SUPERVISOR, password: '123' }
        ],
        notifications: parsed?.notifications || [],
        chatMessages: parsed?.chatMessages || []
      };
    } catch { return { version: APP_VERSION, timestamp: new Date().toISOString(), projects: INITIAL_PROJECTS, tasks: [], users: [], notifications: [], chatMessages: [] }; }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'sync' | 'chat' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleUpdateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.update();
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  const pushToCloud = useCallback(async (snapshot: AppSnapshot) => {
    const raw = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
    if (!raw) return;
    try {
      syncLockRef.current = true;
      setIsSyncing(true);
      const cfg: GithubConfig = JSON.parse(raw);
      const url = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}`;
      const headers = { 'Authorization': `Bearer ${cfg.token.trim()}`, 'Accept': 'application/vnd.github+json' };
      
      const getRes = await fetch(url, { headers, cache: 'no-store' });
      const sha = getRes.ok ? (await getRes.json()).sha : "";
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `v${APP_VERSION} sync`, content: toBase64(JSON.stringify(snapshot, null, 2)), sha: sha || undefined })
      });
      if (res.ok) {
        lastCloudTimeRef.current = new Date(snapshot.timestamp).getTime();
        setSyncError(false);
      }
    } catch { setSyncError(true); }
    finally { setIsSyncing(false); syncLockRef.current = false; }
  }, []);

  const smartMerge = useCallback((remote: AppSnapshot, local: AppSnapshot): AppSnapshot => {
    const merge = <T extends { id: any, updatedAt?: string, createdAt?: string }>(l: T[], r: T[]): T[] => {
      const map = new Map<any, T>();
      l.forEach(i => map.set(i.id, i));
      r.forEach(i => {
        const ex = map.get(i.id);
        const tR = new Date(i.updatedAt || i.createdAt || 0).getTime();
        const tL = ex ? new Date(ex.updatedAt || ex.createdAt || 0).getTime() : 0;
        if (!ex || tR > tL) map.set(i.id, i);
      });
      return Array.from(map.values());
    };
    return {
      ...remote, version: APP_VERSION, timestamp: new Date().toISOString(),
      projects: merge(local.projects, remote.projects),
      tasks: merge(local.tasks, remote.tasks),
      chatMessages: merge(local.chatMessages, remote.chatMessages),
      notifications: merge(local.notifications, remote.notifications),
      users: remote.users 
    };
  }, []);

  const handleImportData = useCallback((incoming: AppSnapshot) => {
    setDb(prev => smartMerge(incoming, prev));
  }, [smartMerge]);

  useEffect(() => {
    const poll = setInterval(async () => {
      if (syncLockRef.current || isSyncing) return;
      const raw = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      if (!raw) return;
      try {
        const cfg: GithubConfig = JSON.parse(raw);
        const res = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}`, { 
          headers: { 'Authorization': `Bearer ${cfg.token.trim()}` }, cache: 'no-store' 
        });
        if (res.ok) {
          const remote = JSON.parse(fromBase64((await res.json()).content)) as AppSnapshot;
          if (new Date(remote.timestamp).getTime() > Math.max(new Date(db.timestamp).getTime(), lastCloudTimeRef.current)) {
            handleImportData(remote);
          }
          setSyncError(false);
        }
      } catch { setSyncError(true); }
    }, 10000); 
    return () => clearInterval(poll);
  }, [db.timestamp, isSyncing, handleImportData]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.MASTER_STATE, JSON.stringify(db)); }, [db]);

  const updateTaskStatus = (tid: number, st: TaskStatus, file?: File, cmt?: string) => {
    setDb(prev => {
      const now = new Date().toISOString();
      const updated: AppSnapshot = {
        ...prev, timestamp: now,
        tasks: prev.tasks.map(t => t.id === tid ? { 
          ...t, status: st, updatedAt: now, supervisorComment: cmt || t.supervisorComment,
          evidenceUrls: file ? [...(t.evidenceUrls || []), URL.createObjectURL(file)] : t.evidenceUrls,
          evidenceCount: file ? (t.evidenceCount + 1) : t.evidenceCount
        } : t)
      };
      pushToCloud(updated); return updated;
    });
  };

  const handleSendMessage = (text: string, pid?: number) => {
    setDb(prev => {
      const now = new Date().toISOString();
      const msg = { id: generateUID('m'), author: currentUser?.username || '?', role: activeRole, text, createdAt: now };
      let up: AppSnapshot;
      if (pid) {
        up = { ...prev, timestamp: now, projects: prev.projects.map(p => p.id === pid ? { ...p, updatedAt: now, comments: [...(p.comments || []), msg] } : p) };
      } else {
        up = { ...prev, timestamp: now, chatMessages: [...prev.chatMessages, { ...msg, userId: currentUser?.id || 0, username: currentUser?.username || '?' }] };
      }
      pushToCloud(up); return up;
    });
  };

  if (!currentUser) return <LoginPage users={db.users} onLogin={u => { setCurrentUser(u); setActiveRole(u.role); localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(u)); }} onApplyInvite={c => {
    try {
      const i: InvitePayload = JSON.parse(fromBase64(c));
      localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify({ token: i.token, repo: i.repo, path: i.path }));
      const u = db.users.find(x => x.role === i.role) || db.users[0];
      setCurrentUser(u); setActiveRole(u.role); localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(u));
      window.history.replaceState({}, '', '/'); return true;
    } catch { return false; }
  }} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return <GlobalChat messages={db.chatMessages} currentUser={currentUser} currentRole={activeRole} onSendMessage={handleSendMessage} />;
      case 'admin': return <AdminPanel users={db.users} currentUser={currentUser} activeRole={activeRole} onUpdateUsers={u => setDb(prev => ({...prev, users: u}))} onRoleSwitch={setActiveRole} />;
      case 'sync': return <BackupManager currentUser={currentUser} currentDb={db} onDataImport={handleImportData} />;
      case 'profile': return (
        <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4">
          <div className={`p-8 rounded-[2.5rem] border text-center ${activeRole === UserRole.ADMIN ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100 shadow-xl'}`}>
            <div className="w-20 h-20 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mx-auto mb-6"><UserCircle size={48} /></div>
            <h2 className={`text-xl font-black mb-1 ${activeRole === UserRole.ADMIN ? 'text-white' : 'text-slate-900'}`}>{currentUser.username}</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-blue-500">{ROLE_LABELS[activeRole]}</p>
            
            <div className="space-y-3">
              <button 
                onClick={handleUpdateApp} 
                className="w-full py-5 font-black rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-100 uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <RefreshCw size={16} /> Обновить приложение
              </button>
              <button 
                onClick={() => { setCurrentUser(null); localStorage.removeItem(STORAGE_KEYS.AUTH_USER); }} 
                className="w-full py-4 font-black rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <LogOut size={16} /> Выход из системы
              </button>
            </div>
          </div>
          <div className="text-center">
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Zodchiy Enterprise • v{APP_VERSION}</p>
          </div>
        </div>
      );
    }

    if (editingProject) return <ProjectForm project={editingProject} onSave={p => { setDb(prev => ({ ...prev, projects: prev.projects.map(o => o.id === p.id ? p : o) })); setEditingProject(null); }} onCancel={() => setEditingProject(null)} />;
    if (selectedTaskId) return <TaskDetails task={db.tasks.find(t => t.id === selectedTaskId)!} role={activeRole} isAdmin={activeRole === UserRole.ADMIN} onClose={() => setSelectedTaskId(null)} onStatusChange={updateTaskStatus} onAddComment={(tid, txt) => handleSendMessage(txt)} onAddEvidence={(tid, f) => updateTaskStatus(tid, db.tasks.find(x => x.id === tid)!.status, f)} />;
    if (selectedProjectId) return <ProjectView project={db.projects.find(p => p.id === selectedProjectId)!} tasks={db.tasks.filter(t => t.projectId === selectedProjectId)} currentUser={currentUser} activeRole={activeRole} onBack={() => setSelectedProjectId(null)} onEdit={setEditingProject} onAddTask={() => {}} onSelectTask={setSelectedTaskId} onSendMessage={t => handleSendMessage(t, selectedProjectId)} onAddFile={(pid, f, cat) => { setDb(prev => { const now = new Date().toISOString(); const up = { ...prev, timestamp: now, projects: prev.projects.map(p => p.id === pid ? { ...p, updatedAt: now, fileLinks: [...(p.fileLinks || []), { name: f.name, url: URL.createObjectURL(f), category: cat, createdAt: now }] } : p) }; pushToCloud(up); return up; }); }} />;

    return (
      <div className="space-y-4">
         <h2 className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-1">Объекты управления</h2>
         <div className="grid gap-3">
           {db.projects.map(p => (
             <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className={`p-5 rounded-3xl border shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-between ${activeRole === UserRole.ADMIN ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'}`}>
               <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${activeRole === UserRole.ADMIN ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{p.name[0]}</div>
                 <div className="text-left">
                   <h3 className={`font-black tracking-tight leading-none mb-1 ${activeRole === UserRole.ADMIN ? 'text-white' : 'text-slate-800'}`}>{p.name}</h3>
                   <p className="text-[8px] font-bold uppercase opacity-30">{p.address}</p>
                 </div>
               </div>
               <LayoutGrid size={14} className="opacity-10" />
             </div>
           ))}
         </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${activeRole === UserRole.ADMIN ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
      <header className={`px-5 py-4 border-b flex items-center justify-between shrink-0 z-40 backdrop-blur-md ${activeRole === UserRole.ADMIN ? 'bg-slate-900/80 border-white/5 text-white' : 'bg-white/80 border-slate-100 text-slate-900 shadow-sm'}`}>
        <button onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); }} className="flex items-center gap-3">
          <Logo isMaster={activeRole === UserRole.ADMIN} size={36} />
          <div className="flex flex-col text-left">
            <h1 className="text-base font-black tracking-tighter leading-none">ЗОДЧИЙ <span className="text-blue-500 text-[8px] opacity-40 ml-1">v{APP_VERSION}</span></h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${isSyncing ? 'bg-blue-500/10 text-blue-400' : syncError ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <Wifi size={8} className={isSyncing ? "animate-pulse" : ""} />
                {isSyncing ? "Синхронизация..." : syncError ? "Оффлайн" : "В сети"}
              </div>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
           <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-xl relative hover:bg-black/5 transition-colors">
             <Bell size={18} />
             {db.notifications.some(n => !n.isRead) && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>}
           </button>
           <button onClick={() => setActiveTab('profile')} className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shadow-lg">
             {currentUser.username[0]}
           </button>
        </div>
      </header>

      {showNotifications && <NotificationCenter notifications={db.notifications} currentRole={activeRole} onClose={() => setShowNotifications(false)} onMarkRead={id => setDb(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === id ? {...n, isRead: true} : n)}))} onClearAll={() => setDb(prev => ({ ...prev, notifications: [] }))} />}

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-hide">
        {renderContent()}
      </main>

      <nav className={`fixed bottom-0 left-0 right-0 border-t px-6 pt-3 pb-[calc(1rem+var(--sab))] flex items-center justify-between z-50 backdrop-blur-xl ${activeRole === UserRole.ADMIN ? 'bg-slate-900/95 border-white/5' : 'bg-white/95 border-slate-100 shadow-2xl'}`}>
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-blue-500 scale-110' : 'opacity-40 hover:opacity-100'}`}>
          <LayoutGrid size={24} /><span className="text-[7px] font-black uppercase">Объекты</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chat' ? 'text-blue-500 scale-110' : 'opacity-40 hover:opacity-100'}`}>
          <MessageSquare size={24} /><span className="text-[7px] font-black uppercase">Чат</span>
        </button>
        {activeRole === UserRole.ADMIN && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'admin' ? 'text-blue-500 scale-110' : 'opacity-40 hover:opacity-100'}`}>
            <CheckSquare size={24} /><span className="text-[7px] font-black uppercase">Админ</span>
          </button>
        )}
        <button onClick={() => setActiveTab('sync')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'sync' ? 'text-blue-500 scale-110' : 'opacity-40 hover:opacity-100'}`}>
          <div className="relative"><RefreshCw size={24} className={isSyncing ? "animate-spin" : ""} /><Cloud size={10} className="absolute -top-1 -right-1" /></div>
          <span className="text-[7px] font-black uppercase">Синхро</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-blue-500 scale-110' : 'opacity-40 hover:opacity-100'}`}>
          <UserCircle size={24} /><span className="text-[7px] font-black uppercase">Профиль</span>
        </button>
      </nav>
      <AIAssistant projectContext={db.projects[0]?.name || ""} />
    </div>
  );
};

export default App;