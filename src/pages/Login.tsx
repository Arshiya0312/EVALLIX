import React from 'react';
import logo from '../assets/images/evalix_red_grad_logo_1779726809684.png';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const [facultyName, setFacultyName] = React.useState(() => localStorage.getItem('last_faculty_name') || '');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSimpleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (rememberMe) {
        localStorage.setItem('last_faculty_name', facultyName.trim());
    } else {
        localStorage.removeItem('last_faculty_name');
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: facultyName })
      });
      
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        toast.success(`Welcome back, Prof. ${data.user.name}`);
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || "Authentication failed");
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-50 to-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[480px] relative z-10"
      >
        <Card className="glass-card border-none shadow-3xl overflow-hidden rounded-[3.5rem] bg-white/70 backdrop-blur-3xl">
          <CardContent className="p-12 md:p-16 text-center">
            <div className="mb-12 flex flex-col items-center">
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0], y: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center overflow-hidden shadow-2xl shadow-red-500/40 mb-10 relative group"
              >
                <img src={logo} alt="Evalix Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] scale-90 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-800 mb-3">Evalix <span className="text-[#E63939]">AI</span></h1>
              <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.5em]">Forensic academic evaluation</p>
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-red-50/50 border border-red-100 text-left mb-10 relative overflow-hidden group">
                <p className="text-sm text-slate-600 font-bold leading-relaxed relative z-10">
                  Welcome to the Faculty Hub. Please enter your name to access the forensic academic evaluation engine.
                </p>
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.05] rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
              </div>

              <form onSubmit={handleSimpleLogin} className="flex flex-col gap-6">
                <div className="space-y-2 text-left px-2">
                  <Label htmlFor="facultyName" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Full Name</Label>
                  <Input 
                    id="facultyName"
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    className="h-16 rounded-2xl border-2 border-red-100 bg-white/50 focus:border-red-500 transition-all text-lg font-bold"
                  />
                </div>
                <div className="flex items-center gap-3 px-2">
                   <input 
                     type="checkbox" 
                     id="remember" 
                     checked={rememberMe} 
                     onChange={(e) => setRememberMe(e.target.checked)}
                     className="w-5 h-5 rounded-md border-red-100 text-[#E63939] focus:ring-[#E63939]"
                   />
                   <Label htmlFor="remember" className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">Remember my faculty node</Label>
                </div>
                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-20 rounded-[2rem] bg-[#E63939] text-white hover:bg-red-700 font-black text-xl flex items-center justify-center gap-5 transition-all shadow-2xl shadow-red-500/30 active:scale-95 btn-pulse"
                >
                  {isLoading ? "Authenticating..." : "Faculty Login"}
                </Button>
              </form>

              <div className="pt-10 flex flex-col items-center gap-4">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
                  Powered by Gemini 2.0 Pro Multimodal
                </p>
                <div className="flex gap-1.5">
                   {[1,2,3].map(i => <div key={i} className="w-8 h-1 bg-red-500/10 rounded-full" />)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-12 text-center flex flex-col items-center gap-3">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Authorized faculty nodes only</p>
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest leading-none">Neural Link Secured</span>
          </div>
        </div>
      </motion.div>

      {/* Decorative Accents */}
      <div className="absolute -top-60 -left-60 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute -bottom-60 -right-60 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] animate-pulse" />
    </div>
  );
}
