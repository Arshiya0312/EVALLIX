import React from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette, Save, Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Settings() {
  const { user, token, login } = useAuth();
  const [activeTab, setActiveTab] = React.useState('Profile Identity');
  const [profile, setProfile] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [alerts, setAlerts] = React.useState({
    'Evaluation Completed': true,
    'Student Submission Alert': true,
    'System Updates': false,
    'Security Breach': true
  });
  const [visuals, setVisuals] = React.useState({
    'Cinematic Transitions': true
  });

  const handleUpdateProfile = async () => {
    try {
      const res = await fetch('/api/faculty/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: profile.name })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local auth state
        login(data.token, data.user);
        toast.success("Profile updated successfully");
      }
    } catch (e) {
      toast.error("Failed to update profile");
    }
  };

  const handlePhotoUpload = () => {
    toast.info("Neural optics module calibration pending. Manual image override temporarily restricted.");
  };

  const toggleAlert = (name: string) => {
    setAlerts(prev => ({ ...prev, [name as keyof typeof alerts]: !prev[name as keyof typeof alerts] }));
  };

  const toggleVisual = (name: string) => {
    setVisuals(prev => ({ ...prev, [name as keyof typeof visuals]: !prev[name as keyof typeof visuals] }));
  };

  const tabs = [
    { label: 'Profile Identity', icon: User },
    { label: 'Neural Alerts', icon: Bell },
    { label: 'Access Control', icon: Shield },
    { label: 'Visual Interface', icon: Palette },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h1 className="text-5xl font-black tracking-tighter mb-2 text-slate-800 dark:text-white">Neural <span className="text-primary">Settings</span></h1>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Configure your academic identity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 border-r border-primary/5 pr-8 space-y-4">
           {tabs.map((item, i) => (
             <Button 
               key={i} 
               variant="ghost" 
               onClick={() => setActiveTab(item.label)}
               className={`w-full justify-start h-14 rounded-2xl gap-4 font-black uppercase tracking-widest text-[10px] ${activeTab === item.label ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary' : 'text-slate-500 hover:bg-primary/5 hover:text-primary'}`}
             >
               <item.icon size={18} />
               {item.label}
             </Button>
           ))}
        </div>

        <div className="lg:col-span-2 space-y-8">
           {activeTab === 'Profile Identity' && (
             <>
               <Card className="glass-card border-none rounded-[3rem] overflow-hidden">
                 <CardHeader className="p-10 pb-0">
                   <CardTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white italic">Identity Manifest</CardTitle>
                   <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-2">Manage your faculty credentials and visibility.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-10 space-y-10">
                   <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                      <div className="relative group">
                        <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-2xl">
                          <AvatarImage src={user?.photo} />
                          <AvatarFallback className="bg-primary text-white text-4xl font-black">{user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <Button 
                          onClick={handlePhotoUpload}
                          size="icon" 
                          className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                        >
                           <Camera size={18} />
                        </Button>
                      </div>
                      
                      <div className="flex-1 space-y-6 w-full">
                        <div className="grid gap-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Academic Nomenclature</Label>
                          <Input 
                            value={profile.name} 
                            onChange={e => setProfile({...profile, name: e.target.value})}
                            className="h-16 rounded-2xl border-primary/10 bg-primary/5 focus:bg-white dark:focus:bg-slate-900 shadow-sm text-lg font-bold"
                          />
                        </div>
                        
                        <div className="grid gap-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Institutional ID</Label>
                          <Input 
                            value={profile.email} 
                            disabled
                            className="h-16 rounded-2xl border-primary/10 bg-slate-50 dark:bg-slate-950 opacity-50 shadow-sm font-medium"
                          />
                        </div>
                      </div>
                   </div>

                   <Separator className="bg-primary/5" />

                   <div className="flex justify-end">
                     <Button onClick={handleUpdateProfile} className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 font-black shadow-xl shadow-primary/20 gap-3">
                       <Save size={20} />
                       Synchronize Changes
                     </Button>
                   </div>
                 </CardContent>
               </Card>

               <Card className="glass-card border-none rounded-[3rem] overflow-hidden opacity-60">
                 <CardContent className="p-10 flex items-center justify-between">
                    <div>
                       <h4 className="font-black text-xl text-slate-800 dark:text-white mb-1">Two-Factor Authentication</h4>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enhanced neural security protocol</p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-primary/20 font-black uppercase tracking-widest text-[9px] h-12 px-6">Configure</Button>
                 </CardContent>
               </Card>
             </>
           )}

           {activeTab === 'Neural Alerts' && (
             <Card className="glass-card border-none rounded-[3rem] overflow-hidden">
               <CardHeader className="p-10">
                 <CardTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white italic">Neural Alerts</CardTitle>
                 <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-2">Configure real-time evaluation notifications.</CardDescription>
               </CardHeader>
               <CardContent className="p-10 space-y-6">
                  {Object.keys(alerts).map(alert => (
                    <div key={alert} className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/5">
                       <span className="font-bold text-slate-700 dark:text-slate-200">{alert}</span>
                       <div 
                         onClick={() => toggleAlert(alert)}
                         className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${alerts[alert as keyof typeof alerts] ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}
                       >
                          <motion.div 
                            animate={{ x: alerts[alert as keyof typeof alerts] ? 24 : 4 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                          />
                       </div>
                    </div>
                  ))}
               </CardContent>
             </Card>
           )}

           {activeTab === 'Access Control' && (
             <Card className="glass-card border-none rounded-[3rem] overflow-hidden">
               <CardHeader className="p-10">
                 <CardTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white italic">Access Control</CardTitle>
                 <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-2">Node visibility and organizational permissions.</CardDescription>
               </CardHeader>
               <CardContent className="p-10 space-y-6">
                  <div className="p-10 rounded-[2rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-center gap-4">
                     <Shield size={48} className="text-primary/20" />
                     <p className="text-slate-500 font-bold">Standard Faculty permissions active. Administrator node override currently disabled.</p>
                  </div>
               </CardContent>
             </Card>
           )}

           {activeTab === 'Visual Interface' && (
             <Card className="glass-card border-none rounded-[3rem] overflow-hidden">
               <CardHeader className="p-10">
                 <CardTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white italic">Visual Interface</CardTitle>
                 <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-2">Thematic rendering and cinematic settings.</CardDescription>
               </CardHeader>
               <CardContent className="p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-6 rounded-2xl border-2 border-primary bg-primary/5 flex items-center justify-between">
                        <span className="font-bold text-primary">Neural Slate (Default)</span>
                        <CheckCircle size={20} className="text-primary" />
                     </div>
                     <div className="p-6 rounded-2xl border border-slate-200 flex items-center justify-between opacity-50 cursor-not-allowed">
                        <span className="font-bold text-slate-400">Cyber Cyan (Locked)</span>
                     </div>
                  </div>
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/5">
                     <span className="font-bold text-slate-700 dark:text-slate-200">Cinematic Transitions</span>
                     <div 
                       onClick={() => toggleVisual('Cinematic Transitions')}
                       className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${visuals['Cinematic Transitions'] ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}
                     >
                        <motion.div 
                          animate={{ x: visuals['Cinematic Transitions'] ? 24 : 4 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                        />
                     </div>
                  </div>
               </CardContent>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}
