
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserRole, Task, TaskStatus, Project, User, ProjectStatus, ROLE_LABELS, Comment, ProjectFile, FileCategory, APP_VERSION } from './types.ts';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectView } from './components/ProjectView.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { 
  LayoutGrid, 
  UserCircle, 
  Plus, 
  ChevronRight,
  MapPin,
  Building2,
  LogOut,
  Cloud,
  Users,
  CheckSquare,
  RotateCcw,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowUpCircle
} from 'lucide-react';

export const STORAGE_KEYS = {
  PROJECTS: `zodchiy_projects_v${APP_VERSION}`,
  TASKS: `zodchiy_tasks_v${APP_VERSION}`,
  USERS: `zodchiy_users_v${APP_VERSION}`,
  AUTH_USER: `zodchiy_auth_v${APP_VERSION}`,
  GH_CONFIG: `zodchiy_gh_config_v${APP_VERSION}`,
  LAST_SYNC: `zodchiy_last_sync_v${APP_VERSION}`
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Объект "Елизово-Холл"',
    description: 'Строительство загородного дома премиум-класса. Площадь 250м2.',
    clientFullName: 'Александров Александр Александрович',
    city: 'Елизово',
    street: 'Магистральная, 42',
    phone: '+7 900 123-45-67',
    telegram: 'yelizovo_pro',
    address: 'г. Елизово, ул. Магистральная, 42',
    geoLocation: { lat: 53.1873, lon: 158.3905 },
    fileLinks: [],
    progress: 45,
    status: ProjectStatus.IN_PROGRESS,
    comments: [
      { id: 1, author: 'Менеджер', role: UserRole.MANAGER, text: 'Проект на стадии возведения стен второго этажа.', createdAt: new Date().toISOString() }
    ],
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_TASKS: Task[] = [
  {
    id: 101,
    projectId: 1,
    title: 'Армирование фундамента',
    description: 'Вязка арматуры по проекту КЖ-1. Проверка шага ячейки 200х200.',
    status: TaskStatus.DONE,
    evidenceUrls: ['https://images.unsplash.com/photo-1590059393043-da5357876356?auto=format&fit=crop&q=80&w=600'],
    evidenceCount: 1,
    comments: [
      { id: 1, author: 'Технадзор', role: UserRole.SUPERVISOR, text: 'Армирование выполнено качественно. Замечаний нет.', createdAt: new Date().toISOString() }
    ],
    updatedAt: new Date().toISOString()
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && parsed.length > 0) ? parsed : INITIAL_PROJECTS;
    } catch { return INITIAL_PROJECTS; }
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    try { 
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && parsed.length > 0) ? parsed : INITIAL_TASKS;
    } catch { return INITIAL_TASKS; }
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [
      { id: 1, username: 'Администратор', role: UserRole.ADMIN },
      { id: 2, username: 'Менеджер Объектов', role: UserRole.MANAGER },
      { id: 3, username: 'Главный Прораб', role: UserRole.FOREMAN },
      { id: 4, username: 'Технический Надзор', role: UserRole.SUPERVISOR }
    ];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'admin' | 'backup' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverVersion, setServerVersion] = useState(APP_VERSION);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // --- ЛОГИКА СИНХРОНИЗАЦИИ ---
  
  const performSync = useCallback(async (forcePush = false) => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      // 1. Отправляем текущее состояние (Push)
      const lastSync = Number(localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || 0);
      const now = Date.now();

      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects,
          tasks,
          app_version: APP_VERSION,
          timestamp: now
        })
      });

      // 2. Получаем актуальное состояние (Pull)
      const response = await fetch('/api/sync');
      const data = await response.json();

      if (data.appVersion && data.appVersion !== APP_VERSION) {
        setServerVersion(data.appVersion);
        setUpdateAvailable(true);
      }

      if (data.lastUpdated > lastSync) {
        setProjects(data.projects);
        setTasks(data.tasks);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, data.lastUpdated.toString());
      }
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [projects, tasks]);

  useEffect(() => {
    const interval = setInterval(() => performSync(), 15000); // Синхронизация каждые 15 сек
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, [performSync]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [projects, tasks, users]);

  const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const filteredTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProjectId), [tasks, selectedProjectId]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setActiveTab('dashboard');
  };

  const forceAppUpdate = () => {
    if (window.confirm("Установить новую версию системы? Приложение будет перезапущено.")) {
      window.location.reload();
    }
  };

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-24 flex flex-col w-full max-w-2xl mx-auto bg-slate-50 shadow-sm relative overflow-x-hidden">
      
      {/* Баннер обновления */}
      {updateAvailable && (
        <div className="bg-blue-600 text-white p-3 flex items-center justify-between animate-in slide-in-from-top-full z-[100]">
          <div className="flex items-center gap-2">
            <ArrowUpCircle size={18} />
            <span className="text-[10px] font-black uppercase">Новая версия: {serverVersion}</span>
          </div>
          <button onClick={forceAppUpdate} className="bg-white text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">Обновить</button>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-[60] px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); setActiveTab('dashboard'); }}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg relative">
               <Building2 size={24} />
               {isSyncing && <RefreshCw size={10} className="absolute -bottom-1 -right-1 text-white bg-blue-500 rounded-full animate-spin p-0.5 border border-white" />}
            </div>
            <div className="flex flex-col text-left">
              <h1 className="font-black text-lg tracking-tighter uppercase leading-none text-slate-900">ЗОДЧИЙ</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">v{APP_VERSION}</p>
                {isOnline ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-rose-500" />}
              </div>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase text-blue-600 px-2 py-1.5 bg-blue-50 rounded-lg">{ROLE_LABELS[activeRole]}</span>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden text-slate-900">
        {activeTab === 'dashboard' && !selectedProjectId && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest text-left">Объекты ({projects.length})</h2>
              {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                <button onClick={() => {}} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-all">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className="grid gap-3">
              {projects.map(p => (
                <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group text-left">
                  <div className="flex items-center gap-4 truncate">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <MapPin size={20} />
                    </div>
                    <div className="truncate">
                      <h4 className="font-black text-slate-900 text-sm truncate">{p.name}</h4>
                      <p className="text-[9px] font-bold text-slate-500 uppercase truncate">{p.address}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-200 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProjectId && currentProject && !selectedTaskId && (
          <ProjectView 
            project={currentProject}
            tasks={filteredTasks}
            currentUser={currentUser}
            activeRole={activeRole}
            onBack={() => setSelectedProjectId(null)}
            onEdit={() => {}}
            onAddTask={() => {}}
            onSelectTask={(tid) => setSelectedTaskId(tid)}
            onSendMessage={(t) => {
              const newComment: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text: t, createdAt: new Date().toISOString() };
              const updatedProjects = projects.map(p => p.id === currentProject.id ? { ...p, comments: [...(p.comments || []), newComment], updatedAt: new Date().toISOString() } : p);
              setProjects(updatedProjects);
              performSync(); // Отправляем сообщение сразу
            }}
          />
        )}

        {selectedTaskId && (tasks.find(t => t.id === selectedTaskId)) && (
          <TaskDetails 
            task={tasks.find(t => t.id === selectedTaskId)!} 
            role={activeRole} 
            onClose={() => setSelectedTaskId(null)} 
            onStatusChange={(tid, ns, ev, com) => {
              const updatedTasks = tasks.map(t => t.id === tid ? { ...t, status: ns, supervisorComment: com || t.supervisorComment, updatedAt: new Date().toISOString() } : t);
              setTasks(updatedTasks);
              performSync();
            }} 
            onAddComment={(tid, text) => {
              const c: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text, createdAt: new Date().toISOString() };
              const updatedTasks = tasks.map(t => t.id === tid ? { ...t, comments: [...(t.comments || []), c], updatedAt: new Date().toISOString() } : t);
              setTasks(updatedTasks);
              performSync();
            }} 
            onAddEvidence={(tid, file) => {
               const r = new FileReader(); r.onloadend = () => {
                 const updatedTasks = tasks.map(t => t.id === tid ? { ...t, evidenceUrls: [...t.evidenceUrls, r.result as string], evidenceCount: t.evidenceCount + 1, updatedAt: new Date().toISOString() } : t);
                 setTasks(updatedTasks);
                 performSync();
               }; r.readAsDataURL(file);
            }}
            onUpdateTask={(ut) => {
              setTasks(prev => prev.map(t => t.id === ut.id ? { ...ut, updatedAt: new Date().toISOString() } : t));
              performSync();
            }}
          />
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
             <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest text-left">Задачи ({tasks.length})</h2>
             <div className="grid gap-3">
               {tasks.map(t => (
                 <div key={t.id} onClick={() => { setSelectedProjectId(t.projectId); setSelectedTaskId(t.id); }} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer group text-left">
                    <div className="truncate">
                      <h4 className="font-black text-slate-900 text-sm truncate">{t.title}</h4>
                      <p className="text-[9px] font-black uppercase text-blue-600 mt-1 italic">Объект: {projects.find(p => p.id === t.projectId)?.name}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-200 group-hover:text-blue-600 transition-all" />
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'admin' && <AdminPanel users={users} onUpdateUsers={setUsers} currentUser={currentUser!} activeRole={activeRole} onRoleSwitch={setActiveRole} />}
        {activeTab === 'backup' && <BackupManager currentUser={currentUser} onDataImport={(d) => { if(d.projects) setProjects(d.projects); if(d.tasks) setTasks(d.tasks); if(d.users) setUsers(d.users); }} />}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 text-center space-y-6 shadow-sm border border-slate-100">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto text-2xl font-black shadow-xl border-4 border-white">{currentUser?.username[0].toUpperCase()}</div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{currentUser?.username}</h3>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{ROLE_LABELS[activeRole]}</p>
              </div>
              <button onClick={handleLogout} className="w-full bg-slate-50 text-slate-500 font-black py-5 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 border border-slate-100"><LogOut size={18} /> Выйти</button>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-left">Системные настройки</h4>
               <button 
                onClick={() => performSync(true)} 
                className="w-full bg-blue-50 text-blue-600 font-black py-5 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 border border-blue-100 mb-3"
               >
                 <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> Принудительная синхронизация
               </button>
               <button 
                onClick={() => { if(confirm("Сброс к стандарту?")) setProjects(INITIAL_PROJECTS); }} 
                className="w-full bg-amber-50 text-amber-600 font-black py-5 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 border border-amber-100"
               >
                 <RotateCcw size={18} /> Вернуться к Стандарту
               </button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 z-[70] w-full max-w-2xl mx-auto rounded-t-3xl shadow-2xl safe-area-bottom">
        <div className="flex justify-around items-center py-4 px-2">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
            <LayoutGrid size={22} /><span className="text-[7px] font-black uppercase">Объекты</span>
          </button>
          <button onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'tasks' ? 'text-blue-600' : 'text-slate-400'}`}>
            <CheckSquare size={22} /><span className="text-[7px] font-black uppercase">Задачи</span>
          </button>
          {activeRole === UserRole.ADMIN && (
            <>
              <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-400'}`}>
                <Users size={22} /><span className="text-[7px] font-black uppercase">Команда</span>
              </button>
              <button onClick={() => setActiveTab('backup')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'backup' ? 'text-blue-600' : 'text-slate-400'}`}>
                <Cloud size={22} /><span className="text-[7px] font-black uppercase">Облако</span>
              </button>
            </>
          )}
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}>
            <UserCircle size={22} /><span className="text-[7px] font-black uppercase">Профиль</span>
          </button>
        </div>
      </nav>

      <AIAssistant projectContext={currentProject ? `Объект: ${currentProject.name}.` : 'Обзор системы.'} />
    </div>
  );
};

export default App;
