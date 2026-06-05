import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  UserSquare2, 
  BarChart3, 
  LogOut, 
  Moon, 
  Sun,
  Settings,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'My Classes', path: '/classes', icon: UserSquare2 },
  { label: 'Evaluation', path: '/evaluate', icon: BookOpen },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle('dark');
    setIsDark(root.classList.contains('dark'));
  };

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 glass-sidebar flex flex-col p-6 gap-8 z-50 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="flex items-center gap-3 px-2 relative z-10">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Evalix <span className="text-primary">Pro</span></h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Intelligent Eval</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2 relative z-10">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 font-bold' 
                  : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'}
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                  <span className="text-sm">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex items-center justify-between px-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl w-12 h-12 hover:bg-primary/10 hover:text-primary">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <NavLink to="/settings">
              <Button variant="ghost" size="icon" className="rounded-xl w-12 h-12 hover:bg-primary/10 hover:text-primary">
                <Settings size={20} />
              </Button>
            </NavLink>
          </div>

          <Separator className="bg-primary/10" />
          
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={user?.photo} />
                <AvatarFallback className="bg-primary text-white">{user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-bold truncate max-w-[120px]">{user?.name || 'Faculty'}</span>
                <span className="text-[10px] text-muted-foreground font-medium">Verified AI Expert</span>
              </div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            onClick={logout}
            className="w-full justify-start gap-3 rounded-2xl text-primary hover:text-primary/80 hover:bg-primary/10 px-4 h-12"
          >
            <LogOut size={18} />
            <span className="font-semibold text-sm">Sign Out</span>
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-background">
        {/* Cinematic lighting */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/[0.03] rounded-full blur-[150px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-muted/[0.02] rounded-full blur-[120px] -z-10" />
        
        <div className="p-4 md:p-6 lg:p-8 w-full mx-auto relative z-10">
          {/* Header Tagline */}
          <header className="mb-8 flex justify-between items-center px-2">
             <div className="flex flex-col">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Cinematic Performance</h2>
                <div className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                   <p className="text-sm font-extrabold italic">Evalix — Intelligence in Every Evaluation</p>
                </div>
             </div>
             <div className="flex gap-4">
                {/* Visual accents */}
                <div className="h-1 w-12 bg-primary rounded-full opacity-20" />
                <div className="h-1 w-6 bg-primary rounded-full opacity-10" />
             </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
};

