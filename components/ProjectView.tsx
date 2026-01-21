
import React from 'react';
import { Project, User, UserRole, ROLE_LABELS } from '../types.ts';
import { Building2, Phone, Send, Navigation, Pencil, Plus, ChevronLeft, MessageSquare } from 'lucide-react';
import { ProjectChat } from './ProjectChat.tsx';
import TaskCard from './TaskCard.tsx';

interface ProjectViewProps {
  project: Project;
  tasks: any[];
  currentUser: User;
  activeRole: UserRole;
  onBack: () => void;
  onEdit: (p: Project) => void;
  onAddTask: () => void;
  onSelectTask: (tid: number) => void;
  onSendMessage: (text: string) => void;
}

/**
 * @constant GOLDEN_STANDARD_V1_1_1
 * Этот компонент зафиксирован как эталон.
 * Иерархия: ВЫЗОВ (emerald) -> TELEGRAM (blue) -> МАРШРУТ (amber).
 */
export const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  tasks,
  currentUser,
  activeRole,
  onBack,
  onEdit,
  onAddTask,
  onSelectTask,
  onSendMessage
}) => {
  const canEdit = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between px-1">
        <button onClick={onBack} className="text-slate-600 font-black text-[10px] uppercase flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm active:scale-95 transition-all">
          <ChevronLeft size={16}/> Назад
        </button>
        {canEdit && (
          <button onClick={() => onEdit(project)} className="p-3 bg-white text-blue-600 rounded-xl border border-slate-100 shadow-sm active:scale-90 transition-all flex items-center gap-2">
            <Pencil size={18} />
            <span className="text-[10px] font-black uppercase">Изменить</span>
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm text-left">
        <div className="flex gap-4 mb-8">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-slate-900 truncate leading-tight">{project.name}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 truncate">{project.address}</p>
          </div>
        </div>

        {/* СТАНДАРТ: КНОПКИ СВЯЗИ */}
        <div className="space-y-3 mb-8">
          <a 
            href={`tel:${project.phone}`} 
            className="flex items-center justify-center gap-4 p-5 bg-emerald-50 text-emerald-700 rounded-[1.8rem] border border-emerald-100 active:scale-[0.98] transition-all shadow-sm group hover:bg-emerald-100/50"
          >
            <div className="p-2.5 bg-white rounded-xl text-emerald-600 shadow-sm transition-transform flex items-center justify-center">
              <Phone size={24} />
            </div>
            <span className="text-lg font-black tracking-widest text-emerald-800">
              {project.phone || 'НОМЕР НЕ УКАЗАН'}
            </span>
          </a>
          
          <div className="grid grid-cols-2 gap-3">
            <a 
              href={`https://t.me/${project.telegram?.replace('@', '')}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-[1.5rem] border border-blue-100 active:scale-95 transition-all shadow-sm hover:bg-blue-100/50"
            >
              <Send size={20} className="rotate-[-20deg]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-800">Telegram</span>
            </a>
            <a 
              href={`https://maps.yandex.ru/?text=${encodeURIComponent(project.address)}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-3 p-4 bg-amber-50 text-amber-700 rounded-[1.5rem] border border-amber-100 active:scale-95 transition-all shadow-sm hover:bg-amber-100/50"
            >
              <Navigation size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Маршрут</span>
            </a>
          </div>
        </div>

        <div className="mb-10 border-t border-slate-50 pt-8">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageSquare size={14} /> Чат объекта
          </h4>
          <ProjectChat 
            messages={project.comments || []} 
            currentUser={currentUser} 
            currentRole={activeRole} 
            onSendMessage={onSendMessage} 
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Работы на объекте</h4>
            {canEdit && (
              <button onClick={onAddTask} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg active:scale-90 transition-all">
                <Plus size={18} />
              </button>
            )}
          </div>
          <div className="grid gap-3">
            {tasks.length === 0 ? (
              <div className="p-12 bg-slate-50 rounded-2xl text-center border-2 border-dashed border-slate-100">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Задач пока нет</p>
              </div>
            ) : (
              tasks.map(t => (
                <div key={t.id} onClick={() => onSelectTask(t.id)}>
                  <TaskCard task={t} role={activeRole} onStatusChange={() => {}} onAddComment={() => {}} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
