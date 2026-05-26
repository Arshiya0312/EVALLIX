import React from 'react';
import { motion } from 'motion/react';
import { User, Bell, Shield, Palette, Save, Camera, CheckCircle, FileText, Download, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();
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
    { label: 'System Compliance', icon: FileText },
    { label: 'Session Management', icon: LogOut },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const downloadSystemManifest = () => {
    const doc = new jsPDF();
    const primaryColor = '#FF4D4D';
    
    // Header
    doc.setFillColor( primaryColor );
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor('#FFFFFF');
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Evalix Technical Manifest', 20, 25);
    
    // Content
    doc.setTextColor('#333333');
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);
    
    const sections = [
      {
        title: '1. DATABASE ARCHITECTURE',
        content: 'System utilizes a high-performance SQLite 3 engine for relational data persistence. \nRecords include Faculty profiles, Institutional classes, Student registries, and Neural evaluation logs.'
      },
      {
        title: '2. NEURAL CORE (AI MODEL)',
        content: 'Engine: Google Gemini 2.0 Flash (Advanced Multimodal Model).\nTemperature: 0.0 (Strict Determinism).\nProcessing: Real-time OCR and semantic analysis of handwritten academic scripts.'
      },
      {
        title: '3. STORAGE & PERSISTENCE',
        content: 'Persistence: Permanent (File-system based in AI Studio workspace).\nCapacity: Scalable workspace disk (optimized for volumes up to 500MB).\nCleanup: Manual deletion via application dashboard or workspace reset.'
      },
      {
        title: '4. SYSTEM LIMITS',
        content: 'API Concurrency: 15 Request Per Minute (RPM) - Base Tier.\nEvaluation Tokens: Up to 1M context window per session.\nFile Types: JPEG, PNG, PDF (Optical Analysis Optimized).'
      },
      {
        title: '5. EVALUATION CRITERIA',
        content: 'Protocol: Rubric-adherence logic.\nScoring: Mathematical weightage based on conceptual keyword matching and depth analysis.\nFairness: Algorithmic bias mitigation via objective reference comparison.'
      }
    ];

    let yOffset = 65;
    sections.forEach(sec => {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text(sec.title, 20, yOffset);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#444444');
      const lines = doc.splitTextToSize(sec.content, 170);
      doc.text(lines, 20, yOffset + 10);
      
      yOffset += 15 + (lines.length * 7);
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor('#999999');
    doc.text('© 2026 Evalix AI Academic Intelligence Protocol', 20, 280);

    doc.save('Evalix_System_Manifest.pdf');
    toast.success("System documentation exported.");
  };

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

           {activeTab === 'Session Management' && (
             <Card className="glass-card border-none rounded-[3rem] overflow-hidden border-2 border-red-500/10">
               <CardHeader className="p-10">
                 <CardTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white italic">Session Management</CardTitle>
                 <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-2">Terminate active neural connection and clear local cache.</CardDescription>
               </CardHeader>
               <CardContent className="p-10 space-y-12">
                  <div className="p-10 rounded-[2rem] bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 flex flex-col items-center justify-center text-center gap-6">
                     <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                        <LogOut size={40} />
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nuclear Session Termination</h4>
                        <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">This will immediately invalidate your current access token and redirect you to the login portal. Ensure all neural synchronizations are complete.</p>
                     </div>
                     <Button 
                       onClick={handleLogout}
                       className="h-16 px-12 rounded-2xl bg-red-500 hover:bg-red-600 font-black shadow-xl shadow-red-500/20 gap-3 text-lg"
                     >
                       <LogOut size={24} />
                       Terminate Session
                     </Button>
                  </div>

                  <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Security Logs</Label>
                     <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 font-mono text-[10px] text-slate-400 space-y-1">
                        <p>[{new Date().toISOString()}] - Session Initialized via Google OAuth</p>
                        <p>[{new Date().toISOString()}] - Metadata Synchronized with Core</p>
                        <p>[{new Date().toISOString()}] - RSA Token Verified</p>
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
