import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  BookCopy, 
  Target, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';

const StatCard = ({ icon: Icon, label, value, color, delay }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -10, 
        rotateX: 5, 
        rotateY: 5,
        transition: { duration: 0.2 } 
      }}
      transition={{ delay }}
      className="perspective-1000"
    >
      <Card className="glass-card border-none overflow-hidden relative group cursor-default bg-white/90 dark:bg-slate-900/90">
        <CardContent className="p-6 md:p-8">
          <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-primary/10 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700`} />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className={`p-4 rounded-2xl transition-all duration-300 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white`}>
              <Icon size={24} />
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="font-black text-4xl text-primary opacity-10 group-hover:opacity-20 transition-opacity"
            >
              {label.includes('Avg.') ? value + '%' : value}
            </motion.div>
          </div>
          
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};


export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = React.useState({ classes: 0, subjects: 0, evaluationsToday: 0, performance: 0 });

  React.useEffect(() => {
    if (!token) return;
    fetch('/api/dashboard/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : { classes: 0, subjects: 0, evaluationsToday: 0, performance: 0 })
    .then(data => setStats(data))
    .catch(() => {});
  }, [token]);

  return (
    <div className="space-y-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-8"
      >
        <div>
          <h1 className="text-5xl font-black tracking-tighter mb-3 text-slate-800 dark:text-white">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Prof. {user?.name?.split(' ')[0] || 'Faculty'}</span>
          </h1>
          <p className="text-slate-500 font-semibold flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            Academic Node Synced: {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button asChild className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold gap-3 btn-pulse">
            <Link to="/evaluate">
              <Plus size={20} />
              Evaluate Now
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard icon={Users} label="Active Classes" value={stats.classes} color="primary" delay={0.1} />
        <StatCard icon={BookCopy} label="Active Subjects" value={stats.subjects} color="primary" delay={0.2} />
        <StatCard icon={Target} label="Done Today" value={stats.evaluationsToday} color="primary" delay={0.3} />
        <StatCard icon={TrendingUp} label="Avg. Performance" value={stats.performance} color="primary" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card border-none shadow-xl overflow-hidden min-h-[400px] bg-white/90 dark:bg-slate-900/90">
             <CardContent className="p-6 md:p-10">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Recent Activity</h2>
                   <Button variant="ghost" className="text-primary font-bold hover:bg-primary/10 gap-2">
                     View Logs <ChevronRight size={16} />
                   </Button>
                </div>
                
                <div className="flex flex-col items-center justify-center h-64 text-center">
                   <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary/30 mb-4 animate-pulse">
                     <BookCopy size={32} />
                   </div>
                   <p className="text-slate-500 font-medium">No evaluations processed in this workcycle yet.</p>
                </div>
             </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-primary to-primary/80 border-none shadow-2xl text-white overflow-hidden h-full">
            <CardContent className="p-6 md:p-10 relative flex flex-col h-full justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4">
                <Target size={120} />
              </div>
              
              <div>
                <h3 className="text-3xl font-black tracking-tighter mb-4 leading-tight">Evaluation Precision Engine</h3>
                <p className="text-primary-foreground/80 font-medium text-sm leading-relaxed mb-8">
                  Unlock deep insights into student cognition using forensic AI analysis. Compare answer logic with primary sources in real-time.
                </p>
                
                <div className="space-y-4">
                  {['Handwritten OCR Support', 'Multimodal PDF Analysis', 'Neural Feedback Generation'].map(t => (
                    <div key={t} className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-md text-white/90">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest">{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-xs font-black uppercase tracking-widest opacity-60">System Health</p>
                   <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 bg-white/40 rounded-full" />)}
                   </div>
                </div>
                <Button className="bg-white text-primary hover:bg-slate-50 font-black h-14 rounded-2xl w-full">
                   Analyze Node Connectivity
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* App Usage Guide */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="pt-12 pb-8 border-t border-slate-100 dark:border-slate-800"
      >
        <div className="flex flex-col gap-8">
           <div className="flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-slate-100 dark:to-slate-800" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">App Usage Guide</h3>
              <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-slate-100 dark:to-slate-800" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Setup Classes', desc: 'Register your classrooms and student rosters in the My Classes tab.' },
                { step: '02', title: 'Upload Materials', desc: 'In Evaluator, provide the Question Paper and Student Answer Sheet.' },
                { step: '03', title: 'Neural Synthesis', desc: 'AI analyzes handwriting and awards marks based on semantic depth.' },
                { step: '04', title: 'Export Insights', desc: 'Download comprehensive PDF/Excel reports in the Reports tab.' }
              ].map((item, idx) => (
                <motion.div 
                   key={idx}
                   whileHover={{ y: -5 }}
                   className="glass-card p-6 rounded-3xl relative overflow-hidden bg-white/90 dark:bg-slate-900/90"
                >
                  <div className="absolute top-0 right-0 p-4 font-black text-4xl opacity-5 text-primary">{item.step}</div>
                  <div className="mb-4 w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black text-sm">{item.step}</div>
                  <h4 className="font-bold text-slate-800 dark:text-white mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold tracking-tight">{item.desc}</p>
                </motion.div>
              ))}
           </div>
        </div>
      </motion.section>
    </div>
  );
}
