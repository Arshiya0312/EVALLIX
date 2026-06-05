import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MoreVertical, 
  BookOpen, 
  Users, 
  Trash2, 
  Search, 
  Upload, 
  FileSpreadsheet,
  X,
  FileText,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Class, Subject, Student } from '@/types';
import BulkImportWizard from '@/components/BulkImportWizard';

export default function MyClasses() {
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [activeClass, setActiveClass] = React.useState<Class | null>(null);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Form states
  const [newClass, setNewClass] = React.useState({ name: '', semester: '', year: '', section: '' });
  const [newSub, setNewSub] = React.useState({ name: '' });
  const [newStudent, setNewStudent] = React.useState({ roll_no: '', name: '' });
  const [showBulkImport, setShowBulkImport] = React.useState(false);

  const { token } = useAuth();

  const [showAddDialog, setShowAddDialog] = React.useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn("Sync classes failed");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleCreateClass = async () => {
    if (!newClass.name) return toast.error("Class name is required");
    setLoading(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newClass)
      });
      if (res.ok) {
        toast.success("Class node initialized");
        await fetchData();
        setNewClass({ name: '', semester: '', year: '', section: '' });
        setShowAddDialog(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create class infrastructure");
      }
    } catch (err: any) {
      toast.error("Network synchronization error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = async (cls: Class) => {
    setActiveClass(cls);
    setLoading(true);
    try {
      const [subRes, stuRes] = await Promise.all([
        fetch(`/api/classes/${cls.id}/subjects`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/classes/${cls.id}/students`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (!subRes.ok || !stuRes.ok) throw new Error("Synchronization failed");
      
      setSubjects(await subRes.json());
      setStudents(await stuRes.json());
    } catch (err) {
      toast.error("Failed to sync neural nodes for this class");
      setSubjects([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSub.name) return;
    const res = await fetch(`/api/classes/${activeClass?.id}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newSub)
    });
    if (res.ok) {
      const s = await res.json();
      setSubjects([...subjects, s]);
      setNewSub({ name: '' });
      toast.success("Branch added");
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.roll_no) return;
    const res = await fetch(`/api/classes/${activeClass?.id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newStudent)
    });
    if (res.ok) {
      const s = await res.json();
      setStudents([...students, s]);
      setNewStudent({ roll_no: '', name: '' });
      toast.success("Identity registered");
    } else {
      const err = await res.json();
      toast.error(err.error);
    }
  };

  const handleUploadMaterial = async (subId: string, type: 'textbook' | 'notes', file: File) => {
    const formData = new FormData();
    formData.append(type, file);
    const res = await fetch(`/api/subjects/${subId}/materials`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (res.ok) {
      toast.success(`${type === 'textbook' ? 'Textbook' : 'Notes'} synchronized`);
      // Update local state if needed
      setSubjects(subjects.map(s => s.id.toString() === subId.toString() ? { ...s, [`${type}_url`]: file.name } : s));
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter mb-2 text-slate-800 dark:text-white">Classroom <span className="text-primary">Assets</span></h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Cinematic Academic Architecture</p>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger render={(props) => (
            <div {...props} className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold gap-3 btn-pulse flex items-center text-white cursor-pointer transition-all">
              <Plus size={20} />
              Add Class
            </div>
          )} />
          <DialogContent className="sm:max-w-[425px] glass-card border-none shadow-3xl rounded-[2.5rem] p-10 bg-white/90 dark:bg-slate-900/90">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-black tracking-tight text-slate-800 dark:text-white italic">Class Architecture</DialogTitle>
              <DialogDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-2">Provision a new academic node.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Class Signature</label>
                <Input placeholder="e.g. CSE-A" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} className="h-14 rounded-xl border-primary/10 bg-primary/5 focus:bg-white dark:focus:bg-slate-950 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Quarter/Sem</label>
                  <Input placeholder="Semester 4" value={newClass.semester} onChange={e => setNewClass({...newClass, semester: e.target.value})} className="h-14 rounded-xl border-primary/10 bg-primary/5 focus:bg-white dark:focus:bg-slate-950 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Academic Year</label>
                  <Input placeholder="2025-26" value={newClass.year} onChange={e => setNewClass({...newClass, year: e.target.value})} className="h-14 rounded-xl border-primary/10 bg-primary/5 focus:bg-white dark:focus:bg-slate-950 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Section/Module</label>
                <Input placeholder="Section 1" value={newClass.section} onChange={e => setNewClass({...newClass, section: e.target.value})} className="h-14 rounded-xl border-primary/10 bg-primary/5 focus:bg-white dark:focus:bg-slate-950 transition-all" />
              </div>
            </div>
            <DialogFooter className="mt-10">
              <Button onClick={handleCreateClass} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-xl shadow-primary/20">Provision Node</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Classes List */}
        <div className="lg:col-span-1 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Classroom Nodes</h3>
              <Badge className="bg-primary/10 text-primary border-none font-black px-2 py-0.5">{classes.length}</Badge>
           </div>
           
           <ScrollArea className="h-[calc(100vh-350px)] pr-4">
              <div className="flex flex-col gap-3">
                {classes.map(cls => (
                  <motion.button
                    whileHover={{ x: 5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={cls.id}
                    onClick={() => handleSelectClass(cls)}
                    className={`
                      w-full p-5 rounded-3xl text-left transition-all duration-300 group relative overflow-hidden
                      ${activeClass?.id === cls.id 
                        ? 'bg-primary text-white shadow-xl shadow-primary/30' 
                        : 'glass-card border-none hover:bg-primary/5 hover:shadow-primary/5'}
                    `}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <h4 className="font-black text-xl tracking-tight mb-1 truncate max-w-[120px]">{cls.name}</h4>
                        <div className="flex items-center gap-2 opacity-60">
                           <span className="text-[10px] font-bold uppercase tracking-widest">{cls.semester}</span>
                           <div className="w-1 h-1 rounded-full bg-current" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">{cls.year}</span>
                        </div>
                      </div>
                      <ChevronRight className={`transition-transform duration-300 ${activeClass?.id === cls.id ? 'translate-x-1' : 'opacity-20 text-primary'}`} size={18} />
                    </div>
                    {activeClass?.id === cls.id && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    )}
                  </motion.button>
                ))}
              </div>
           </ScrollArea>
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {activeClass ? (
              <motion.div
                key={activeClass.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="space-y-8"
              >
                <div className="p-6 md:p-10 rounded-[2.5rem] glass-card border-none relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[80px] -mr-32 -mt-32" />
                   
                   <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                      <div>
                        <div className="flex items-center gap-6 mb-6">
                          <div className="p-5 bg-primary/10 text-primary rounded-[2rem] shadow-inner">
                            <GraduationCap size={40} />
                          </div>
                          <div>
                            <h2 className="text-5xl font-black tracking-tighter leading-none text-slate-800 dark:text-white truncate">{activeClass.name}</h2>
                            <p className="text-primary font-bold uppercase text-[10px] tracking-[0.4em] mt-3">Node Identity Manifest</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                           {[`SEC ${activeClass.section}`, activeClass.semester, activeClass.year].map(t => (
                             <Badge key={t} variant="outline" className="rounded-xl border-primary/10 bg-primary/5 dark:bg-primary/20 flex items-center gap-2 px-4 py-2 font-black uppercase tracking-widest text-[9px] text-primary">
                                <div className="w-1 h-1 rounded-full bg-primary" />
                                {t}
                             </Badge>
                           ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                         <Button variant="ghost" className="h-14 w-14 rounded-2xl border border-primary/10 p-0 hover:bg-primary hover:text-white transition-all">
                            <Trash2 size={20} />
                         </Button>
                      </div>
                   </div>

                   <Tabs defaultValue="subjects" className="mt-12 relative z-10">
                      <TabsList className="bg-primary/5 rounded-[1.5rem] p-1.5 h-16 gap-1.5 items-stretch">
                        <TabsTrigger value="subjects" className="rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex-1 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">
                          <BookOpen size={16} className="mr-2" />
                          Subjects
                        </TabsTrigger>
                        <TabsTrigger value="students" className="rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex-1 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">
                          <Users size={16} className="mr-2" />
                          Students
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="subjects" className="pt-10 space-y-8">
                        <div className="flex items-center gap-4">
                           <Input 
                             placeholder="Subject Nomenclature..." 
                             value={newSub.name}
                             onChange={e => setNewSub({name: e.target.value})}
                             className="h-16 rounded-[1.5rem] border-primary/10 bg-primary/5 dark:bg-primary/10 focus:bg-white dark:focus:bg-slate-900 text-lg" 
                           />
                           <Button onClick={handleAddSubject} className="h-16 px-10 rounded-[1.5rem] bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20">
                             Provision
                           </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {subjects.map(sub => (
                             <motion.div 
                               whileHover={{ y: -5, scale: 1.01 }}
                               key={sub.id} 
                               className="p-8 rounded-[2.5rem] glass-card border-none flex flex-col gap-6 group"
                             >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-6">
                                     <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shadow-inner shadow-primary/5">
                                        <FileText size={24} />
                                     </div>
                                     <div>
                                        <h5 className="font-black text-xl tracking-tight text-slate-800 dark:text-white">{sub.name}</h5>
                                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] mt-1">Reference Core Active</p>
                                     </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary">
                                     <MoreVertical size={20} />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl">
                                   <div className="space-y-2">
                                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Neural Textbook</p>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) handleUploadMaterial(sub.id, 'textbook', file);
                                          };
                                          input.click();
                                        }}
                                        className={`h-11 w-full rounded-xl border-dashed transition-all duration-300 ${sub.textbook_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white dark:bg-slate-900 border-primary/20 text-slate-500 hover:border-primary/40'} text-[9px] font-black uppercase tracking-widest gap-2 flex items-center justify-center`}
                                      >
                                         {sub.textbook_url ? (
                                           <>
                                             <CheckCircle2 size={16} className="text-emerald-500" />
                                             <span>Synced</span>
                                           </>
                                         ) : (
                                           <>
                                             <Upload size={14} />
                                             <span>Upload</span>
                                           </>
                                         )}
                                      </Button>
                                   </div>
                                   <div className="space-y-2">
                                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Reference Notes</p>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) handleUploadMaterial(sub.id, 'notes', file);
                                          };
                                          input.click();
                                        }}
                                        className={`h-11 w-full rounded-xl border-dashed transition-all duration-300 ${sub.notes_url ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-white dark:bg-slate-900 border-primary/20 text-slate-500 hover:border-primary/40'} text-[9px] font-black uppercase tracking-widest gap-2 flex items-center justify-center`}
                                      >
                                         {sub.notes_url ? (
                                           <>
                                             <CheckCircle2 size={16} className="text-emerald-500" />
                                             <span>Synced</span>
                                           </>
                                         ) : (
                                           <>
                                             <Upload size={14} />
                                             <span>Upload</span>
                                           </>
                                         )}
                                      </Button>
                                   </div>
                                </div>
                             </motion.div>
                           ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="students" className="pt-10 space-y-8">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                           <Input 
                             placeholder="Roll No..." 
                             value={newStudent.roll_no}
                             onChange={e => setNewStudent({...newStudent, roll_no: e.target.value})}
                             className="h-16 rounded-[1.5rem] border-primary/10 bg-primary/5 dark:bg-primary/10 w-full md:w-40 shrink-0" 
                           />
                           <Input 
                             placeholder="Full Nomenclature..." 
                             value={newStudent.name}
                             onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                             className="h-16 rounded-[1.5rem] border-primary/10 bg-primary/5 dark:bg-primary/10 w-full flex-1" 
                           />
                           <Button onClick={handleAddStudent} className="h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 font-black w-full md:w-auto px-12 shrink-0 shadow-lg shadow-primary/20">Register</Button>
                           
                           <div className="hidden md:block w-px h-10 bg-primary/10 mx-2" />
                           
                           <Button 
                             variant="outline" 
                             onClick={() => setShowBulkImport(true)}
                             className="h-16 rounded-[1.5rem] border-emerald-500/20 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all font-black px-8 shrink-0 flex items-center gap-3 shadow-lg shadow-emerald-500/5 group"
                           >
                              <FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform" />
                              Bulk Import
                           </Button>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            {students.map(stu => (
                              <div key={stu.id} className="group h-48 perspective-1000">
                                 <motion.div 
                                   whileHover={{ rotateY: 180 }}
                                   transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                                   className="relative w-full h-full preserve-3d"
                                 >
                                    {/* Front */}
                                    <div className="absolute inset-0 backface-hidden glass-card rounded-[2rem] p-8 flex flex-col justify-between border-none">
                                       <div className="flex justify-between items-start">
                                          <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary font-black">
                                             {stu.roll_no}
                                          </div>
                                          <Badge className="bg-primary/10 text-primary border-none">Active</Badge>
                                       </div>
                                       <div>
                                          <h5 className="font-black text-lg text-slate-800 dark:text-white line-clamp-1">{stu.name || 'Anonymous Entity'}</h5>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Identity Confirmed</p>
                                       </div>
                                    </div>
                                    
                                    {/* Back */}
                                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary rounded-[2rem] p-8 flex flex-col justify-center items-center text-center text-white border-none shadow-2xl shadow-primary/40">
                                       <Users size={32} className="mb-4 opacity-50" />
                                       <p className="font-black text-sm uppercase tracking-widest mb-4">Actions Required</p>
                                       <div className="flex gap-4">
                                          <Button size="icon" variant="ghost" className="bg-white/20 hover:bg-white text-white hover:text-primary rounded-xl transition-all">
                                             <FileText size={18} />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="bg-white/20 hover:bg-black/20 text-white rounded-xl transition-all">
                                             <Trash2 size={18} />
                                          </Button>
                                       </div>
                                    </div>
                                 </motion.div>
                              </div>
                            ))}
                            {students.length === 0 && (
                              <div className="col-span-full py-24 text-center glass-card rounded-[3rem] border-none">
                                 <Users size={48} className="mx-auto text-primary/20 mb-6" />
                                 <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-sm">Waiting for Registered Identities</p>
                              </div>
                            )}
                         </div>
                      </TabsContent>
                   </Tabs>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] text-center">
                 <div className="w-40 h-40 bg-primary/5 rounded-[4rem] flex items-center justify-center text-primary/20 mb-8 animate-float shadow-inner">
                    <GraduationCap size={80} />
                 </div>
                 <h3 className="text-3xl font-black text-slate-300 dark:text-slate-700 tracking-tight">Select a Neural Node.</h3>
                 <p className="text-primary font-black uppercase text-[10px] tracking-[0.5em] mt-6">System awaiting instruction...</p>
                 <div className="mt-12 flex gap-4 opacity-20">
                    {[1,2,3].map(i => <div key={i} className="w-12 h-1 bg-primary rounded-full" />)}
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {activeClass && (
        <BulkImportWizard 
          isOpen={showBulkImport} 
          onClose={() => setShowBulkImport(false)} 
          classId={activeClass.id} 
          onImportSuccess={() => handleSelectClass(activeClass)} 
          token={token} 
        />
      )}
    </div>
  );
}

