
import React from 'react';
import { Bell, X, Check, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { AppNotification, UserRole } from '../types.ts';

interface NotificationCenterProps {
  notifications: AppNotification[];
  currentRole: UserRole;
  onClose: () => void;
  onMarkRead: (id: number) => void;
  onClearAll: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  currentRole,
  onClose,
  onMarkRead,
  onClearAll
}) => {
  // Filter notifications relevant to the current user's role or Admin
  const relevantNotifications = notifications.filter(
    n => n.targetRole === currentRole || currentRole === UserRole.ADMIN
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="fixed inset-0 sm:inset-auto sm:right-6 sm:top-24 z-[100] sm:w-[400px] h-full sm:h-auto max-h-[80vh] bg-white sm:rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Уведомления</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">
            Актуальные события по объектам
          </p>
        </div>
        <div className="flex gap-2">
          {relevantNotifications.length > 0 && (
            <button onClick={onClearAll} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Очистить все">
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-800 bg-white rounded-xl shadow-sm sm:hidden">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {relevantNotifications.length > 0 ? (
          relevantNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-6 hover:bg-slate-50 transition-all group relative ${notif.isRead ? 'opacity-60' : ''}`}
              onClick={() => onMarkRead(notif.id)}
            >
              <div className="flex gap-4">
                <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${
                  notif.type === 'review' ? 'bg-amber-50 text-amber-600' :
                  notif.type === 'rework' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {notif.type === 'review' ? <Bell size={18} /> : 
                   notif.type === 'rework' ? <AlertCircle size={18} /> : <Check size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter truncate">
                      {notif.projectTitle}
                    </p>
                    <span className="text-[8px] font-bold text-slate-300 uppercase whitespace-nowrap ml-2">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs truncate mb-1">{notif.taskTitle}</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2 italic">
                    {notif.message}
                  </p>
                </div>
              </div>
              {!notif.isRead && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </div>
          ))
        ) : (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
              <Bell size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Уведомлений пока нет</p>
          </div>
        )}
      </div>
      
      {relevantNotifications.length > 0 && (
        <div className="p-4 bg-slate-50/50 border-t border-slate-50 hidden sm:block">
           <p className="text-[8px] font-black text-slate-300 uppercase text-center tracking-widest">
             Нажмите на уведомление, чтобы отметить как прочитанное
           </p>
        </div>
      )}
    </div>
  );
};
