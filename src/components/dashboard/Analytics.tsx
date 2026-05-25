import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { GlassCard } from '../GlassCard';
import { Badge } from '../UI';
import { motion } from 'motion/react';

interface AnalyticsProps {
  token: string;
}

export function Analytics({ token }: AnalyticsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Analytics fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { day: 'Mon', count: 12 },
    { day: 'Tue', count: 18 },
    { day: 'Wed', count: 15 },
    { day: 'Thu', count: 25 },
    { day: 'Fri', count: 32 },
    { day: 'Sat', count: 20 },
    { day: 'Sun', count: 14 },
  ];

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
      <div className="h-80 bg-slate-100 dark:bg-white/5 rounded-3xl" />
      <div className="h-80 bg-slate-100 dark:bg-white/5 rounded-3xl" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="p-8" hoverLift={false}>
          <div className="flex justify-between items-center mb-8">
             <div>
                <h4 className="text-xl font-black mb-1">Evaluation Velocity</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Processed per session</p>
             </div>
             <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">+12% Growth</Badge>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.1} vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(8px)'
                  }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-8" hoverLift={false}>
          <div className="flex justify-between items-center mb-8">
             <div>
                <h4 className="text-xl font-black mb-1">Top Performers</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Aggregate Score Ranking</p>
             </div>
             <Badge variant="outline" className="text-brand-accent border-brand-accent/20">LIVE DATA</Badge>
          </div>

          <div className="space-y-6">
            {stats?.topPerformers?.length > 0 ? (
              stats.topPerformers.map((p: any, i: number) => (
                <div key={p.student_roll_no} className="flex items-center gap-4 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 dark:bg-white/10'}`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-black uppercase tracking-wider">{p.student_roll_no}</span>
                      <span className="text-xs font-bold text-brand-primary">{p.marks.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, p.marks))}%` }}
                        transition={{ delay: i * 0.1, duration: 1 }}
                        className={`h-full rounded-full ${i === 0 ? 'bg-brand-primary' : 'bg-brand-accent opacity-60'}`}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="h-48 flex items-center justify-center text-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] opacity-50 px-10">Insufficient dataset for performance ranking</p>
                </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
