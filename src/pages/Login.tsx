import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data;
        login(token, user);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [login]);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
      
      window.open(url, 'google_login', `width=${width},height=${height},top=${top},left=${left}`);
    } catch (err) {
      toast.error("Cloud nodes unreachable. Try again later.");
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
                className="w-28 h-28 bg-gradient-to-br from-[#E63939] to-red-700 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-red-500/40 mb-10 relative group"
              >
                <GraduationCap size={56} />
                <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] scale-90 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-800 mb-3">Evalix <span className="text-[#E63939]">AI</span></h1>
              <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.5em]">Forensic academic evaluation</p>
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-red-50/50 border border-red-100 text-left mb-10 relative overflow-hidden group">
                <p className="text-sm text-slate-600 font-bold leading-relaxed relative z-10">
                  Welcome to the Faculty Hub. Use your institutional Google credentials to access high-fidelity assessment nodes.
                </p>
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.05] rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
              </div>

              <div className="flex flex-col gap-5">
                <Button 
                  onClick={handleGoogleLogin}
                  className="w-full h-20 rounded-[2rem] bg-[#E63939] text-white hover:bg-red-700 font-black text-xl flex items-center justify-center gap-5 transition-all shadow-2xl shadow-red-500/30 active:scale-95 btn-pulse"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-7 h-7 bg-white p-1 rounded-full shadow-sm" />
                  Faculty Sign In
                </Button>

                <div className="flex items-center gap-6 py-2">
                  <div className="h-px flex-1 bg-red-100" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">or</span>
                  <div className="h-px flex-1 bg-red-100" />
                </div>

                <Button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/auth/demo', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok) {
                        login(data.token, data.user);
                        toast.success("Identity Bypass: Demo Session Active");
                      } else {
                        throw new Error(data.error || "Demo auth failed");
                      }
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}
                  variant="ghost"
                  className="w-full h-16 rounded-[2rem] border-2 border-red-100 text-[#E63939] hover:bg-red-50 font-black tracking-widest uppercase text-xs"
                >
                  Enter via Demo Gateway
                </Button>
              </div>

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
