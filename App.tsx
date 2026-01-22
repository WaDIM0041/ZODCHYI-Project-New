import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserRole, Task, TaskStatus, Project, User, ProjectStatus, 
  ROLE_LABELS, Comment, APP_VERSION, AppNotification, GlobalChatMessage, AppSnapshot, FileCategory, GithubConfig 
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
import { 
  LayoutGrid, 
  UserCircle, 
  LogOut,
  CheckSquare,
  RefreshCw,
  Bell,
  MessageSquare,
  Cloud,
  Zap,
  Building2
} from 'lucide-react';

export const STORAGE_KEYS = {
  MASTER_STATE: `zodchiy_master_v125`,
  AUTH_USER: `zod_auth_v125`,
  GH_CONFIG: `zod_gh_v125`
};

const fromBase64 = (str: string) => decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Объект "Елизово-Холл"',
    description: 'Строительство загородного дома премиум-класса.',
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
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  
  const [db, setDb] = useState<AppSnapshot>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MASTER_STATE);
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.version === APP_VERSION) return parsed;
      
      return {
        version: APP_VERSION,
        buildNumber: 1,
        timestamp: new Date().toISOString(),
        projects: INITIAL_PROJECTS,
        tasks: [],
        users: [
          { id: 1, username: 'Администратор', role: UserRole.ADMIN, password: '123' },
          { id: 4, username: 'Менеджер', role: UserRole.MANAGER, password: '123' },
          { id: 2, username: 'Прораб', role: UserRole.FOREMAN, password: '123' },
          { id: 3, username: 'Технадзор', role: UserRole.SUPERVISOR, password: '123' }
        ],
        notifications: [],
        chatMessages: []
      };
    } catch { 
      return { version: APP_VERSION, buildNumber: 1, timestamp: new Date().toISOString(), projects: INITIAL_PROJECTS, tasks: [], users: [], notifications: [], chatMessages: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'sync' | 'chat' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Background Polling Logic
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const rawConfig = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      if (!rawConfig) return;
      
      try {
        const config: GithubConfig = JSON.parse(rawConfig);
        if (!config.token || !config.repo) return;

        setIsSyncing(true);
        const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}`;
        const response = await fetch(url, { 
          headers: { 'Authorization': `Bearer ${config.token.trim()}` },
          cache: 'no-store' 
        });
        
        if (response.ok) {
          const data = await response.json();
          const remoteDb = JSON.parse(fromBase64(data.content)) as AppSnapshot;
          
          // Синхронизируем только если облачная версия новее локальной
          if (new Date(remoteDb.timestamp) > new Date(db.timestamp)) {
            console.log("Auto-Sync: New cloud data found. Merging...");
            handleImportData(remoteDb);
          }
          setSyncError(false);
        } else {
          setSyncError(true);
        }
      } catch (err) {
        console.error("Auto-Sync Error:", err);
        setSyncError(true);
      } finally {
        setTimeout(() => setIsSyncing(false), 2000);
      }
    }, 30000); // Опрос каждые 30 секунд

    return () => clearInterval(pollInterval);
  }, [db.timestamp]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MASTER_STATE, JSON.stringify(db));
  }, [db]);

  const handleImportData = useCallback((data: AppSnapshot) => {
    setDb(prev => ({
      ...data,
      buildNumber: (data.buildNumber || prev.buildNumber || 0) + 1,
      version: APP_VERSION,
      timestamp: new Date().toISOString()
    }));
  }, []);

  const resetToHome = () => {
    setActiveTab('dashboard');
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setEditingProject(null);
    setShowNotifications(false);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  };

  const addTask = (projectId: number) => {
    const newTask: Task = {
      id: Date.now(),
      projectId,
      title: 'Новая задача',
      description: 'Введите описание...',
      status: TaskStatus.TODO,
      evidenceUrls: [],
      evidenceCount: 0,
      comments: [],
      updatedAt: new Date().toISOString()
    };
    setDb(prev => ({ ...prev, tasks: [...prev.tasks, newTask], timestamp: new Date().toISOString() }));
    setSelectedTaskId(newTask.id);
  };

  const updateTaskStatus = (taskId: number, newStatus: TaskStatus, evidenceFile?: File, comment?: string) => {
    setDb(prev => ({
      ...prev,
      timestamp: new Date().toISOString(),
      tasks: prev.tasks.map(t => {
        if (t.id === taskId) {
          const updated = { ...t, status: newStatus, updatedAt: new Date().toISOString() };
          if (comment) updated.supervisorComment = comment;
          if (evidenceFile) {
            const fakeUrl = URL.createObjectURL(evidenceFile);
            updated.evidenceUrls = [...updated.evidenceUrls, fakeUrl];
            updated.evidenceCount = updated.evidenceUrls.length;
          }
          return updated;
        }
        return t;
      })
    }));
  };

  const updateProject = (updatedProject: Project) => {
    setDb(prev => ({
      ...prev,
      timestamp: new Date().toISOString(),
      projects: prev.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
    }));
    setEditingProject(null);
  };

  const handleAddFile = (projectId: number, file: File, category: FileCategory) => {
    const fakeUrl = URL.createObjectURL(file);
    setDb(prev => ({
      ...prev,
      timestamp: new Date().toISOString(),
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          const newFile = {
            name: file.name,
            url: fakeUrl,
            category,
            createdAt: new Date().toISOString()
          };
          return {
            ...p,
            fileLinks: [...(p.fileLinks || []), newFile],
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      })
    }));
  };

  if (!currentUser) return <LoginPage users={db.users} onLogin={handleLogin} />;

  const selectedProject = db.projects.find(p => p.id === selectedProjectId);
  const selectedTask = db.tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      <header className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 z-40">
        <button onClick={resetToHome} className="flex items-center gap-3 active:scale-95 transition-all text-left group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100 group-hover:rotate-3 transition-transform">
            <Building2 size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter text-slate-900 leading-none">ЗОДЧИЙ</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none">
                v{APP_VERSION}.{db.buildNumber || 0}
              </p>
              <div className={`w-1 h-1 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : syncError ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-50 transition-all">
            <Bell size={20} />
            {db.notifications.some(n => !n.isRead) && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>}
          </button>
          <button onClick={() => setActiveTab('profile')} className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md">
            {currentUser.username[0]}
          </button>
        </div>
      </header>

      {showNotifications && (
        <NotificationCenter 
          notifications={db.notifications} 
          currentRole={activeRole} 
          onClose={() => setShowNotifications(false)}
          onMarkRead={(id) => setDb(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === id ? {...n, isRead: true} : n)}))}
          onClearAll={() => setDb(prev => ({ ...prev, notifications: [] }))}
        />
      )}

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 text-left">
        {editingProject ? (
          <ProjectForm 
            project={editingProject} 
            onSave={updateProject} 
            onCancel={() => setEditingProject(null)} 
          />
        ) : selectedTaskId ? (
          <TaskDetails 
            task={selectedTask!} 
            role={activeRole} 
            isAdmin={activeRole === UserRole.ADMIN}
            onClose={() => setSelectedTaskId(null)}
            onStatusChange={updateTaskStatus}
            onAddComment={(tid, txt) => setDb(prev => ({ ...prev, timestamp: new Date().toISOString(), tasks: prev.tasks.map(t => t.id === tid ? { ...t, comments: [...(t.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : t) }))}
            onAddEvidence={(tid, file) => updateTaskStatus(tid, selectedTask!.status, file)}
          />
        ) : selectedProjectId ? (
          <ProjectView 
            project={selectedProject!} 
            tasks={db.tasks.filter(t => t.projectId === selectedProjectId)}
            currentUser={currentUser}
            activeRole={activeRole}
            onBack={() => setSelectedProjectId(null)}
            onEdit={setEditingProject}
            onAddTask={() => addTask(selectedProjectId)}
            onSelectTask={setSelectedTaskId}
            onSendMessage={(txt) => setDb(prev => ({ ...prev, timestamp: new Date().toISOString(), projects: prev.projects.map(p => p.id === selectedProjectId ? { ...p, comments: [...(p.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : p) }))}
            onAddFile={handleAddFile}
          />
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Мои объекты</h2>
            <div className="grid gap-4">
              {db.projects.map(p => (
                <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">{p.name[0]}</div>
                    <div className="text-left">
                      <h3 className="font-black text-slate-800 tracking-tight leading-none mb-1 group-hover:text-blue-600">{p.name}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.address}</p>
                    </div>
                  </div>
                  <LayoutGrid size={18} className="text-slate-300 group-hover:text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          <GlobalChat 
            messages={db.chatMessages} 
            currentUser={currentUser} 
            currentRole={activeRole} 
            onSendMessage={(txt) => setDb(prev => ({ ...prev, timestamp: new Date().toISOString(), chatMessages: [...prev.chatMessages, { id: Date.now(), userId: currentUser.id, username: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] }))} 
          />
        ) : activeTab === 'admin' ? (
          <AdminPanel 
            users={db.users} 
            currentUser={currentUser} 
            activeRole={activeRole} 
            onUpdateUsers={(u) => setDb(prev => ({ ...prev, timestamp: new Date().toISOString(), users: u }))} 
            onRoleSwitch={setActiveRole} 
          />
        ) : activeTab === 'sync' ? (
          <BackupManager currentUser={currentUser} currentDb={db} onDataImport={handleImportData} />
        ) : (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCircle size={48} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-1 uppercase tracking-tighter">{currentUser.username}</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-8">{ROLE_LABELS[activeRole]}</p>
            <button onClick={handleLogout} className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-2xl border border-rose-100 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
              <LogOut size={18} /> Выйти
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex items-center justify-between z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button onClick={resetToHome} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
          <LayoutGrid size={22} />
          <span className="text-[7px] font-black uppercase tracking-widest">Объекты</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'chat' ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
          <MessageSquare size={22} />
          <span className="text-[7px] font-black uppercase tracking-widest">Чат</span>
        </button>
        {activeRole === UserRole.ADMIN && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-amber-500 scale-110' : 'text-slate-400'}`}>
            <CheckSquare size={22} />
            <span className="text-[7px] font-black uppercase tracking-widest">Админ</span>
          </button>
        )}
        <button onClick={() => setActiveTab('sync')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'sync' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
          <div className="relative">
            <RefreshCw size={22} />
            <Cloud size={8} className="absolute -top-1 -right-1 text-indigo-500" />
          </div>
          <span className="text-[7px] font-black uppercase tracking-widest">Синхронизация</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
          <UserCircle size={22} />
          <span className="text-[7px] font-black uppercase tracking-widest">Профиль</span>
        </button>
      </nav>

      <AIAssistant projectContext={selectedProject?.name || "Общий контекст"} />
    </div>
  );
};

export default App;