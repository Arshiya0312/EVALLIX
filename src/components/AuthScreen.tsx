import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  IdentificationBadge, 
  SignIn, 
  CircleNotch,
  GoogleLogo
} from 'phosphor-react';
import { GlassCard } from './GlassCard';
import { Button, Input, Label, Separator } from './UI';
import { toast } from 'sonner';
import { signInWithGoogle } from '../lib/firebase';

interface AuthScreenProps {
  onLogin: (token: string, user: any) => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [facultyId, setFacultyId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const validateId = (id: string) => {
    const regex = /^FAC-\d{4}-\d{3}$/;
    return regex.test(id);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      const idToken = await user.getIdToken();
      
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        toast.error(data.error || "Google verification failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Google authentication interrupted");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateId(facultyId)) {
      setError("Format: FAC-YYYY-NNN (e.g. FAC-2024-001)");
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyId, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        toast.error(data.error || "Authentication failed");
      }
    } catch (err) {
      toast.error("Terminal link failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6FF] dark:bg-[#0D0F1C] p-6 transition-colors duration-500 overflow-hidden relative">
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-violet-500/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full animate-pulse animation-delay-2000" />
      
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full"
      >
        <GlassCard className="p-10 border-white/40 dark:border-white/10" hoverLift={false}>
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-violet-500/40 transform -rotate-6">
               <ShieldCheck size={40} weight="bold" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tighter mb-1 uppercase">Faculty Hub</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">SmartEval Professional Dashboard</p>
            </div>
          </div>

          <div className="space-y-6">
            <Button 
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-14 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm"
            >
              {googleLoading ? <CircleNotch size={20} className="animate-spin" /> : <GoogleLogo size={20} weight="bold" />}
              {googleLoading ? 'Verifying Identity...' : 'Sign in with Google'}
            </Button>

            <div className="flex items-center gap-4">
              <Separator />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">OR SECURE ID</span>
              <Separator />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Official ID</Label>
              <div className="relative group">
                <IdentificationBadge size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                <Input 
                  placeholder="FAC-2024-001" 
                  className={`pl-12 font-black ${error ? 'border-rose-500' : ''}`}
                  value={facultyId}
                  onChange={e => {
                    setFacultyId(e.target.value.toUpperCase());
                    if (error) setError('');
                  }}
                  required
                />
              </div>
              {error && <p className="text-[10px] font-bold text-rose-500 pl-1 uppercase">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="font-black"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              disabled={loading}
              className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              {loading ? <CircleNotch size={24} className="animate-spin" /> : <SignIn size={24} weight="bold" />}
              {loading ? 'Initializing...' : 'Authorize Entry'}
            </Button>
            </form>
          </div>

          <div className="mt-10 pt-8 border-t border-black/5 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Access Layer</p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
