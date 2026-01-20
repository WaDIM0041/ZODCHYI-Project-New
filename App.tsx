
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserRole, Task, TaskStatus, Project, User, ProjectStatus, ROLE_LABELS, AppNotification, Comment, ProjectFile, FileCategory } from './types.ts';
import TaskCard from './components/TaskCard.tsx';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { NotificationCenter } from './components/NotificationCenter.tsx';
import { ProjectChat } from './components/ProjectChat.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { 
  LayoutGrid, 
  UserCircle, 
  Plus, 
  ChevronRight,
  MapPin,
  Settings,
  Phone,
  Building2,
  Send,
  Bell,
  Pencil,
  LogOut,
  Database,
  FileText,
  Paperclip,
  Navigation,
  LocateFixed,
  RefreshCw,
  MessageSquare,
  Image as ImageIcon,
  Layers,
  FileCheck,
  ExternalLink,
  X,
  Wifi,
  WifiOff,
  Sparkles
} from 'lucide-react';

const STORAGE_KEYS = {
  PROJECTS: 'stroy_sync_projects_v4',
  TASKS: 'stroy_sync_tasks_v4',
  USERS: 'stroy_sync_users_v4',
  AUTH_USER: 'stroy_sync_auth_v4',
  NOTIFICATIONS: 'stroy_sync_notifs_v4'
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: 103,
    name: 'Дом в Елизово',
    description: 'Строительство частного жилого дома. Стадия: возведение стен первого этажа.',
    clientFullName: 'Смирнов Валентин И.',
    city: 'Елизово',
    street: 'Олимпийская, 42',
    phone: '8 999 0202 5544',
    telegram: '@v_smirnov',
    address: 'Елизово, Олимпийская, 42',
    geoLocation: { lat: 53.1873, lon: 158.3847 },
    fileLinks: [
      { name: 'Генплан_участка.pdf', url: '#', category: FileCategory.DRAWING, createdAt: new Date().toISOString() },
      { name: 'Договор_строительства.pdf', url: '#', category: FileCategory.DOCUMENT, createdAt: new Date().toISOString() }
    ],
    progress: 25,
    status: ProjectStatus.IN_PROGRESS,
    comments: [
      { id: 1, author: 'Админ', role: UserRole.ADMIN, text: 'Проект запущен. Смирнов просил обратить внимание на дренаж.', createdAt: new Date().toISOString() },
      { id: 2, author: 'Прораб', role: UserRole.FOREMAN, text: 'Технику вывели на объект, начинаем разметку.', createdAt: new Date().toISOString() }
    ]
  }
];

const INITIAL_TASKS: Task[] = [
  {
    id: 1001,
    projectId: 103,
    title: 'Заливка фундамента',
    description: 'Бетонирование основной плиты. Марка бетона М350. Использовать виброусадку.',
    status: TaskStatus.DONE,
    evidenceUrls: ['https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&q=80&w=400'],
    evidenceCount: 1,
    comments: [{ id: 1, author: 'технадзор', role: UserRole.SUPERVISOR, text: 'Геометрия плиты в допуске. Принято.', createdAt: new Date().toISOString() }]
  },
  {
    id: 1002,
    projectId: 103,
    title: 'Кладка наружных стен',
    description: 'Газобетонный блок 400мм. Сплошное армирование каждого 4-го ряда.',
    status: TaskStatus.IN_PROGRESS,
    evidenceUrls: [],
    evidenceCount: 0,
    comments: []
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileCategory, setPendingFileCategory] = useState<FileCategory>(FileCategory.DOCUMENT);
  const [fileFilter, setFileFilter] = useState<'all' | FileCategory>('all');
  const [isLocating, setIsLocating] = useState(false);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : INITIAL_PROJECTS;
    } catch { return INITIAL_PROJECTS; }
  });
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : INITIAL_TASKS;
    } catch { return INITIAL_TASKS; }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) return JSON.parse(saved);
      return [
        { id: 1, username: 'админ', role: UserRole.ADMIN, password: '123' },
        { id: 2, username: 'прораб', role: UserRole.FOREMAN, password: '123' },
        { id: 3, username: 'технадзор', role: UserRole.SUPERVISOR, password: '123' }
      ];
    } catch { return []; }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'admin' | 'backup'>('dashboard');
  const [projectListFilter, setProjectListFilter] = useState<ProjectStatus>(ProjectStatus.IN_PROGRESS);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState<Partial<Project>>({});
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setIsBackendOnline(true);
        else setIsBackendOnline(false);
      } catch {
        setIsBackendOnline(false);
      }
    };
    checkHealth();
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { if (currentUser) localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(currentUser)); }, [currentUser]);

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const currentTask = tasks.find(t => t.id === selectedTaskId);
  
  const isActuallyAdmin = activeRole === UserRole.ADMIN;
  const isRealAdmin = currentUser?.role === UserRole.ADMIN;
  const canEditProjects = isActuallyAdmin || activeRole === UserRole.MANAGER;
  const unreadCount = notifications.filter(n => !n.isRead && (n.targetRole === activeRole || activeRole === UserRole.ADMIN)).length;

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  };

  const handleAddProjectComment = (projectId: number, text: string) => {
    if (!currentUser) return;
    const newComment: Comment = {
      id: Date.now(),
      author: currentUser.username,
      role: activeRole,
      text,
      createdAt: new Date().toISOString()
    };
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, comments: [...(p.comments || []), newComment] } : p));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setProjectEditForm(prev => ({ 
          ...prev, 
          geoLocation: { lat: latitude, lon: longitude } 
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=ru`
          );
          const data = await response.json();
          
          if (data && data.address) {
            const a = data.address;
            const city = a.city || a.town || a.village || a.hamlet || a.city_district || a.county || a.state || "";
            const street = a.road || a.pedestrian || a.suburb || a.neighbourhood || a.industrial || a.residential || "";
            const house = a.house_number || a.building || "";
            const streetAndHouse = house ? `${street}, ${house}` : street;

            setProjectEditForm(prev => ({
              ...prev,
              city: city,
              street: streetAndHouse || (data.display_name ? data.display_name.split(',')[0] : "")
            }));
          }
        } catch (error) {
          console.error("Ошибка геокодирования:", error);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "Ошибка получения GPS";
        if (error.code === error.PERMISSION_DENIED) errorMsg = "Доступ к GPS отклонен пользователем";
        alert(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openInMaps = (project: Project) => {
    const addressQuery = encodeURIComponent(project.address);
    const url = `https://yandex.ru/maps/?text=${addressQuery}&z=16`;
    window.open(url, '_blank');
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = `${projectEditForm.city || ''}, ${projectEditForm.street || ''}`.replace(/^, /, '').replace(/, $/, '');
    
    if (editMode && projectEditForm.id) {
      setProjects(prev => prev.map(p => p.id === projectEditForm.id ? { 
        ...p, 
        ...projectEditForm, 
        address: fullAddress 
      } as Project : p));
    } else {
      const newProject: Project = {
        id: Date.now(),
        name: projectEditForm.name || 'Новый объект',
        description: projectEditForm.description || '',
        clientFullName: projectEditForm.clientFullName || '',
        city: projectEditForm.city || '',
        street: projectEditForm.street || '',
        address: fullAddress,
        phone: projectEditForm.phone || '',
        telegram: projectEditForm.telegram || '',
        geoLocation: projectEditForm.geoLocation || { lat: 0, lon: 0 },
        fileLinks: [],
        progress: 0,
        status: ProjectStatus.NEW,
        comments: []
      };
      setProjects(prev => [...prev, newProject]);
    }
    setShowProjectForm(false);
    setEditMode(false);
    setProjectEditForm({});
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus, evidence?: File, comment?: string) => {
    let evidenceUrl = '';
    if (evidence) {
      evidenceUrl = await new Promise((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(evidence);
      });
    }

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedUrls = evidenceUrl ? [...t.evidenceUrls, evidenceUrl] : t.evidenceUrls;
        return { ...t, status: newStatus, evidenceUrls: updatedUrls, supervisorComment: comment || t.supervisorComment, evidenceCount: updatedUrls.length };
      }
      return t;
    }));
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleAddProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    const url: string = await new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result as string);
      r.readAsDataURL(file);
    });
    const newFile: ProjectFile = { name: file.name, url, category: pendingFileCategory, createdAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, fileLinks: [...p.fileLinks, newFile] } : p));
  };

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-24 flex flex-col max-w-2xl mx-auto bg-slate-50 shadow-sm relative">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); }}>
            <Building2 size={28} className="text-blue-600" />
            <div className="flex flex-col">
              <h1 className="font-black text-xl tracking-tighter uppercase leading-none">ЗОДЧИЙ</h1>
              {isBackendOnline !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {isBackendOnline ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-rose-500" />}
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isBackendOnline ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isBackendOnline ? 'Online' : 'Offline Mode'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 bg-slate-50 rounded-xl text-slate-500">
              <Bell size={22} />
              {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
            </button>
            <span className="text-[10px] font-black uppercase text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">{ROLE_LABELS[activeRole]}</span>
          </div>
        </div>
      </header>

      {showNotifications && (
        <NotificationCenter 
          notifications={notifications} 
          currentRole={activeRole} 
          onClose={() => setShowNotifications(false)} 
          onMarkRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n))} 
          onClearAll={() => setNotifications([])} 
        />
      )}

      {/* Модальная форма проекта */}
      {showProjectForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl relative animate-in zoom-in-95">
            <button 
              onClick={() => { setShowProjectForm(false); setProjectEditForm({}); }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8">
              {editMode ? 'Редактирование объекта' : 'Новый объект'}
            </h3>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <input required placeholder="Название объекта" value={projectEditForm.name || ''} onChange={e => setProjectEditForm({...projectEditForm, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50" />
              <input required placeholder="Клиент" value={projectEditForm.clientFullName || ''} onChange={e => setProjectEditForm({...projectEditForm, clientFullName: e.target.value})} className="w-full p-5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50" />
              <input required placeholder="Телефон" value={projectEditForm.phone || ''} onChange={e => setProjectEditForm({...projectEditForm, phone: e.target.value})} className="w-full p-5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input required placeholder="Город" value={projectEditForm.city || ''} onChange={e => setProjectEditForm({...projectEditForm, city: e.target.value})} className="w-full p-5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50" />
                <input required placeholder="Улица, дом" value={projectEditForm.street || ''} onChange={e => setProjectEditForm({...projectEditForm, street: e.target.value})} className="w-full p-5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50" />
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={handleGetCurrentLocation} className="flex-1 p-5 bg-slate-100 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500">
                  {isLocating ? <RefreshCw className="animate-spin" size={18}/> : <LocateFixed size={18}/>} GPS
                </button>
                <input placeholder="Telegram @..." value={projectEditForm.telegram || ''} onChange={e => setProjectEditForm({...projectEditForm, telegram: e.target.value})} className="flex-[2] p-5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-xl uppercase text-[11px] tracking-[0.1em] shadow-xl shadow-blue-100 mt-4 active:scale-95 transition-all">
                {editMode ? 'Сохранить изменения' : 'Создать объект'}
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 p-6">
        {activeTab === 'dashboard' && !selectedProjectId && (
          <div className="space-y-6">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1">
              <button onClick={() => setProjectListFilter(ProjectStatus.IN_PROGRESS)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${projectListFilter === ProjectStatus.IN_PROGRESS ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>В РАБОТЕ</button>
              <button onClick={() => setProjectListFilter(ProjectStatus.NEW)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${projectListFilter === ProjectStatus.NEW ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>НОВЫЕ</button>
              <button onClick={() => setProjectListFilter(ProjectStatus.COMPLETED)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${projectListFilter === ProjectStatus.COMPLETED ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>ОТРАБОТАНО</button>
              {canEditProjects && (
                <button onClick={() => { setEditMode(false); setProjectEditForm({}); setShowProjectForm(true); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><Plus size={24}/></button>
              )}
            </div>

            <div className="grid gap-3">
              {projects.filter(p => p.status === projectListFilter).map(p => (
                <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Building2 size={24} /></div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-800 text-base truncate">{p.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase truncate tracking-tight">{p.address}</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-slate-200 group-hover:text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedProjectId && currentProject && !selectedTaskId && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedProjectId(null)} className="text-slate-500 font-black text-[11px] uppercase flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-100"><ChevronRight className="rotate-180" size={18}/> Назад</button>
              {canEditProjects && (
                <button onClick={() => { setProjectEditForm({...currentProject}); setEditMode(true); setShowProjectForm(true); }} className="text-blue-600 font-black text-[11px] uppercase flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-slate-100"><Pencil size={18}/> Изменить</button>
              )}
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-black text-slate-800 mb-6">{currentProject.name}</h2>
              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Phone size={24}/></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Телефон клиента</p>
                    <p className="text-base font-bold text-slate-800">{currentProject.phone || 'Не указан'}</p>
                  </div>
                  <a href={`tel:${currentProject.phone}`} className="bg-blue-600 text-white p-3.5 rounded-xl shadow-lg"><Phone size={20}/></a>
                </div>
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => openInMaps(currentProject)}>
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><MapPin size={24}/></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Локация</p>
                    <p className="text-base font-bold text-slate-800 truncate underline underline-offset-4">{currentProject.address}</p>
                  </div>
                  <button className="bg-rose-500 text-white p-3.5 rounded-xl shadow-lg"><Navigation size={20}/></button>
                </div>
              </div>

              <div className="space-y-5 mb-8">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button onClick={() => setFileFilter('all')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${fileFilter === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Все</button>
                  <button onClick={() => setFileFilter(FileCategory.DRAWING)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${fileFilter === FileCategory.DRAWING ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>Чертежи</button>
                  <button onClick={() => setFileFilter(FileCategory.DOCUMENT)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${fileFilter === FileCategory.DOCUMENT ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>Документы</button>
                </div>
                <div className="grid gap-3">
                  <input type="file" ref={projectFileInputRef} className="hidden" onChange={handleAddProjectFile} />
                  {canEditProjects && (
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => { setPendingFileCategory(FileCategory.DRAWING); projectFileInputRef.current?.click(); }} className="p-4 bg-amber-50 text-amber-700 rounded-2xl text-[9px] font-black uppercase flex flex-col items-center gap-2 border border-amber-100 active:scale-95"><Paperclip size={22}/> + Чертеж</button>
                      <button onClick={() => { setPendingFileCategory(FileCategory.DOCUMENT); projectFileInputRef.current?.click(); }} className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-[9px] font-black uppercase flex flex-col items-center gap-2 border border-blue-100 active:scale-95"><FileCheck size={22}/> + Док</button>
                      <button onClick={() => { setPendingFileCategory(FileCategory.PHOTO); projectFileInputRef.current?.click(); }} className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[9px] font-black uppercase flex flex-col items-center gap-2 border border-emerald-100 active:scale-95"><ImageIcon size={22}/> + Фото</button>
                    </div>
                  )}
                  {currentProject.fileLinks.filter(f => fileFilter === 'all' || f.category === fileFilter).map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4 min-w-0">
                        <FileText size={20} className="text-slate-400 shrink-0"/>
                        <span className="text-xs font-bold text-slate-700 truncate">{f.name}</span>
                      </div>
                      <a href={f.url} download className="text-blue-600 p-2"><ExternalLink size={20}/></a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <ProjectChat 
                  messages={currentProject.comments || []} 
                  currentUser={currentUser} 
                  currentRole={activeRole} 
                  onSendMessage={(text) => handleAddProjectComment(currentProject.id, text)} 
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase">Задачи ({filteredTasks.length})</h4>
                {canEditProjects && <button onClick={() => setSelectedTaskId(null)} className="text-blue-600 text-[10px] font-black uppercase bg-blue-50 px-3 py-2 rounded-lg">+ Новая задача</button>}
              </div>
              <div className="grid gap-3">
                {filteredTasks.map(t => (
                  <div key={t.id} onClick={() => setSelectedTaskId(t.id)}>
                    <TaskCard task={t} role={activeRole} isAdmin={isActuallyAdmin} onStatusChange={() => {}} onAddComment={() => {}} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTaskId && currentTask && (
          <TaskDetails 
            task={currentTask} 
            role={activeRole} 
            isAdmin={isActuallyAdmin} 
            onClose={() => setSelectedTaskId(null)} 
            onStatusChange={handleStatusChange} 
            onAddComment={(tid, text) => {
              const newComment: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text, createdAt: new Date().toISOString() };
              setTasks(prev => prev.map(t => t.id === tid ? { ...t, comments: [...(t.comments || []), newComment] } : t));
            }} 
            onAddEvidence={(tid, file) => {
               const r = new FileReader(); r.onloadend = () => {
                 setTasks(prev => prev.map(t => t.id === tid ? { ...t, evidenceUrls: [...t.evidenceUrls, r.result as string], evidenceCount: t.evidenceCount + 1 } : t));
               }; r.readAsDataURL(file);
            }} 
            onUpdateTask={handleUpdateTask}
          />
        )}

        {activeTab === 'admin' && <AdminPanel users={users} onUpdateUsers={setUsers} currentUser={currentUser} activeRole={activeRole} onRoleSwitch={setActiveRole} />}
        {activeTab === 'backup' && <BackupManager currentUser={currentUser} />}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-[2.5rem] p-10 text-center space-y-8">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto text-3xl font-black">{currentUser.username[0].toUpperCase()}</div>
            <div>
              <h3 className="text-xl font-black text-slate-800">{currentUser.username}</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">{ROLE_LABELS[currentUser.role]}</p>
            </div>
            <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-black py-5 rounded-2xl uppercase text-[11px] flex items-center justify-center gap-3 active:scale-95 transition-all"><LogOut size={20} /> Выйти из аккаунта</button>
          </div>
        )}
      </main>

      {/* AI Assistant FAB and Modal */}
      {currentUser && (
        <AIAssistant projectContext={currentProject ? `Объект: ${currentProject.name}. Статус: ${currentProject.status}. Задач: ${filteredTasks.length}` : 'Общий обзор системы ЗОДЧИЙ'} />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 z-50 max-w-2xl mx-auto rounded-t-[2.5rem] shadow-2xl safe-area-bottom">
        <div className="flex justify-around items-center py-5 px-4">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-300'}`}>
            <LayoutGrid size={28} /><span className="text-[9px] font-black uppercase">Объекты</span>
          </button>
          {isRealAdmin && (
            <>
              <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-300'}`}>
                <Settings size={28} /><span className="text-[9px] font-black uppercase">Персонал</span>
              </button>
              <button onClick={() => setActiveTab('backup')} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'backup' ? 'text-blue-600' : 'text-slate-300'}`}>
                <Database size={28} /><span className="text-[9px] font-black uppercase">Бэкап</span>
              </button>
            </>
          )}
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-300'}`}>
            <UserCircle size={28} /><span className="text-[9px] font-black uppercase">Профиль</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
