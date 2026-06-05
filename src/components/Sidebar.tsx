import React from 'react';
import { 
  ShieldCheck, 
  SignOut, 
  House, 
  ChartLineUp, 
  ListBullets, 
  IdentificationBadge,
  FileText,
  UserGear
} from 'phosphor-react';
import { motion } from 'framer-motion';
import { Separator, Badge } from './UI';
import { ViewType, Subject } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  selectedSubject: Subject | null;
  setSelectedSubject: (s: Subject | null) => void;
  user: any;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ 
  currentView, 
  setCurrentView, 
  selectedSubject, 
  setSelectedSubject, 
  user, 
  onLogout,
  isOpen,
  setIsOpen
}: SidebarProps) {
  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? '280px' : '80px' }}
      className="fixed left-0 top-0 bottom-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-3xl border-r border-black/5 dark:border-white/5 z-[60] flex flex-col transition-all duration-300"
    >
      <div className="h-20 flex items-center px-6 justify-between">
         <div className={`flex items-center gap-3 overflow-hidden ${isOpen ? 'opacity-100' : 'opacity-0 w-0 transition-all duration-300'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 shrink-0">
               <ShieldCheck size={24} weight="bold" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter whitespace-nowrap leading-tight">SmartEval</h1>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] leading-none">Intelligence</span>
            </div>
         </div>
         <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400">
            <ListBullets size={20} />
         </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
         <NavButton 
           active={currentView === 'dashboard' && !selectedSubject} 
           onClick={() => { setCurrentView('dashboard'); setSelectedSubject(null); }} 
           icon={<House size={20} weight={currentView === 'dashboard' ? 'fill' : 'regular'} />} 
           label="System Hub" 
           collapsed={!isOpen} 
         />
         <NavButton 
           active={currentView === 'history'} 
           onClick={() => { setCurrentView('history'); setSelectedSubject(null); }} 
           icon={<FileText size={20} weight={currentView === 'history' ? 'fill' : 'regular'} />} 
           label="Evaluations" 
           collapsed={!isOpen} 
         />
         <NavButton 
           active={currentView === 'reports'} 
           onClick={() => { setCurrentView('reports'); setSelectedSubject(null); }} 
           icon={<ChartLineUp size={20} weight={currentView === 'reports' ? 'fill' : 'regular'} />} 
           label="Global Reports" 
           collapsed={!isOpen} 
         />
         
         {selectedSubject && (
           <>
             <div className="pt-6 pb-2">
               <Separator className="opacity-50" />
             </div>
             <div className={`px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ${!isOpen && 'hidden'}`}>Active Session</div>
             <NavButton 
               active={currentView === 'subject'} 
               onClick={() => { setCurrentView('subject'); }} 
               icon={<IdentificationBadge size={20} weight="fill" className="text-brand-primary" />} 
               label={selectedSubject.name} 
               collapsed={!isOpen} 
             />
           </>
         )}
      </nav>

      <div className="p-4 mt-auto space-y-4">
         {user && isOpen && (
           <div className="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-black shadow-sm shrink-0 border border-white/20">
                 {user.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="overflow-hidden">
                 <p className="text-xs font-black truncate text-slate-900 dark:text-white">Dr. {user.name}</p>
                 <Badge variant="outline" className="text-[8px] font-black tracking-widest border-brand-primary/20 text-brand-primary h-4 px-1.5 opacity-80">FACULTY</Badge>
              </div>
           </div>
         )}
         <button onClick={onLogout} className="w-full flex items-center gap-4 p-3.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all duration-300 group">
            <SignOut size={20} weight="bold" className="group-hover:translate-x-1 transition-transform" />
            {isOpen && <span className="text-xs font-black uppercase tracking-widest text-inherit">Session Close</span>}
         </button>
      </div>
    </motion.aside>
  );
}

function NavButton({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 group relative ${active ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30 neon-glow' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
    >
      <div className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      {!collapsed && <span className="text-[11px] font-black truncate uppercase tracking-[0.15em]">{label}</span>}
      {active && <motion.div layoutId="nav-active" className="absolute -left-1 w-1 h-6 bg-white rounded-full" />}
    </button>
  );
}
