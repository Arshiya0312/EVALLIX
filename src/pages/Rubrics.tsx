import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  ChevronLeft,
  BookOpen,
  Layers,
  Sparkles,
  FileText,
  Import,
  Search,
  School,
  BookMarked
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Criterion, UnitRubric, Class, Subject } from '@/types';

export default function Rubrics() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<string>('');
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');
  
  const [rubrics, setRubrics] = React.useState<UnitRubric[]>([]);
  const [activeTab, setActiveTab] = React.useState<'unit' | 'question'>('unit');
  
  const [isAdding, setIsAdding] = React.useState(false);
  const [currentName, setCurrentName] = React.useState('');
  const [criteriaList, setCriteriaList] = React.useState<Criterion[]>([]);
  const [questionCriteria, setQuestionCriteria] = React.useState<{ [key: string]: { maxMarks: number, criteria: Criterion[] } }>({
    'Q1': { maxMarks: 5, criteria: [{ name: '', description: '', marks: 0 }] }
  });

  const fetchClasses = async () => {
    const res = await fetch('/api/classes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setClasses(await res.json());
  };

  const fetchSubjects = async (classId: string) => {
    const res = await fetch(`/api/classes/${classId}/subjects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setSubjects(await res.json());
  };

  const fetchRubrics = React.useCallback(async (subjectId: string) => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/rubrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRubrics(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  React.useEffect(() => {
    fetchClasses();
  }, []);

  const handleClassChange = (val: string) => {
    setSelectedClass(val);
    setSelectedSubject('');
    setSubjects([]);
    setRubrics([]);
    fetchSubjects(val);
  };

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    fetchRubrics(val);
    setIsAdding(false);
  };

  const saveRubric = async () => {
    if (!currentName) return toast.error("Please provide a rubric identifier.");
    if (!selectedSubject) return toast.error("Subject node is inactive.");

    const payload = {
      name: currentName,
      type: activeTab,
      criteria: activeTab === 'unit' ? criteriaList : questionCriteria
    };

    try {
      const res = await fetch(`/api/subjects/${selectedSubject}/rubrics`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`${activeTab === 'unit' ? 'Unit' : 'Question'} rubric archived successfully.`);
        fetchRubrics(selectedSubject);
        setIsAdding(false);
        setCurrentName('');
        setCriteriaList([]);
        setQuestionCriteria({ 'Q1': { maxMarks: 5, criteria: [{ name: '', description: '', marks: 0 }] } });
      }
    } catch (e) {
      toast.error("Failed to archive protocol.");
    }
  };

  const deleteRubric = async (id: number) => {
    try {
      const res = await fetch(`/api/rubrics/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Protocol node deleted.");
        fetchRubrics(selectedSubject);
      }
    } catch (e) {
      toast.error("Failed to delete protocol node.");
    }
  };

  const activeSubjectData = subjects.find(s => s.id.toString() === selectedSubject);

  return (
    <div className="min-h-screen pb-20 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Layers className="text-primary" size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Rubric Designer</span>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white"
          >
            Rubric <span className="text-primary italic">Library</span>
          </motion.h1>
          <p className="text-sm font-medium text-slate-400 max-w-xl">Create and manage your marking schemes for automated AI grading.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
           <div className="space-y-1.5 min-w-[200px]">
             <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Target Class</label>
             <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger className="h-12 rounded-xl border-none shadow-xl bg-white dark:bg-slate-900 glass-card">
                  <SelectValue placeholder="Select Class Node" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
             </Select>
           </div>
           <div className="space-y-1.5 min-w-[200px]">
             <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Subject Node</label>
             <Select value={selectedSubject} onValueChange={handleSubjectChange} disabled={!selectedClass}>
                <SelectTrigger className="h-12 rounded-xl border-none shadow-xl bg-white dark:bg-slate-900 glass-card">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
             </Select>
           </div>
        </div>
      </div>

      {!selectedSubject ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 space-y-8"
        >
          <div className="w-32 h-32 bg-slate-100 dark:bg-white/5 rounded-[3rem] flex items-center justify-center text-slate-300 dark:text-slate-700 relative">
             <div className="absolute inset-0 animate-spin-slow border-2 border-dashed border-primary/20 rounded-[3rem]" />
             <Search size={48} />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-200">Select a Subject</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Choose a class and subject node to view marking schemes.</p>
          </div>
        </motion.div>
      ) : (
        <Card className="glass-card border-none shadow-3xl bg-white/95 dark:bg-slate-950/95 rounded-[3rem] overflow-hidden flex flex-col min-h-[70vh]">
           <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
             {/* Left Library Rail */}
             <div className="w-full md:w-80 border-r border-slate-100 dark:border-white/10 p-8 flex flex-col gap-8 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="space-y-4">
                   <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Saved Rubrics</label>
                   <Button 
                    onClick={() => { setIsAdding(true); }}
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[11px] gap-2 shadow-lg shadow-primary/20"
                   >
                    <Plus size={20} /> Create New Rubric
                   </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mb-6">
                        <TabsList className="bg-slate-200 dark:bg-white/5 p-1 rounded-xl h-12 w-full border border-slate-300 dark:border-white/10">
                          <TabsTrigger value="unit" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                             Unit-wise
                          </TabsTrigger>
                          <TabsTrigger value="question" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                             Question-wise
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {rubrics.filter(r => r.type === activeTab).map(r => (
                        <div key={r.id} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 group hover:border-primary/20 transition-all flex justify-between items-center shadow-sm">
                           <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             <div>
                               <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate w-32">{r.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Active matrix</p>
                             </div>
                           </div>
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteRubric(r.id!)}
                            className="text-slate-200 hover:text-red-500 transition-colors"
                           >
                            <Trash2 size={16} />
                           </Button>
                        </div>
                      ))}

                      {rubrics.filter(r => r.type === activeTab).length === 0 && (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center">
                          <BookMarked size={40} className="mb-4" />
                          <p className="text-[9px] font-black uppercase tracking-[0.2em]">Void Hub</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
             </div>

             {/* Right Content View */}
             <div className="flex-1 flex flex-col">
                <div className="p-10 flex-1 flex flex-col">
                  {isAdding ? (
                    <div className="h-full flex flex-col gap-10">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-4">
                            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Rubric Name</label>
                            <Input 
                              placeholder={activeTab === 'unit' ? "e.g. Mid-term Exam Unit 1" : "e.g. Final Question Bank"} 
                              value={currentName} 
                              onChange={e => setCurrentName(e.target.value)}
                              className="h-20 rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900 font-black px-12 text-2xl"
                            />
                         </div>
                         <div className="flex items-end pb-2">
                           <div className="bg-primary/5 rounded-3xl p-6 flex items-center gap-4 border border-primary/10 shadow-inner">
                              <Sparkles size={24} className="text-primary" />
                              <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em] leading-relaxed">Neural Calibrated Matrix</p>
                                <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest leading-relaxed">Model: Gemini 2.0 Flash Enterprise</p>
                              </div>
                           </div>
                         </div>
                       </div>

                       <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex justify-between items-center mb-6 px-2">
                             <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Marking Structure</label>
                             {activeTab === 'unit' ? (
                                <Button 
                                  variant="ghost" 
                                  onClick={() => setCriteriaList([...criteriaList, { name: '', description: '', marks: 0 }])}
                                  className="h-14 rounded-2xl bg-primary/5 text-primary font-black text-[11px] uppercase tracking-widest gap-3 border border-primary/10 px-8"
                                >
                                  <Plus size={18} /> Add Marking Row
                                </Button>
                             ) : (
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                     const nextQ = `Q${Object.keys(questionCriteria).length + 1}`;
                                     setQuestionCriteria({ ...questionCriteria, [nextQ]: { maxMarks: 5, criteria: [{ name: '', description: '', marks: 0 }] } });
                                  }}
                                  className="h-14 rounded-2xl bg-primary/5 text-primary font-black text-[11px] uppercase tracking-widest gap-3 border border-primary/10 px-8"
                                >
                                  <Plus size={18} /> Add Question Node
                                </Button>
                             )}
                          </div>

                          <ScrollArea className="flex-1 pr-10">
                             <div className="space-y-8 pb-32">
                                {activeTab === 'unit' ? (
                                   criteriaList.map((c, i) => (
                                      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} key={i} className="group relative p-10 rounded-[3.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                         <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => setCriteriaList(criteriaList.filter((_, idx) => idx !== i))}
                                          className="absolute top-6 right-8 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                                         >
                                           <Trash2 size={20} />
                                         </Button>
                                         
                                         <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                             <div className="md:col-span-4 space-y-3">
                                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marking Criteria</label>
                                               <Input 
                                                value={c.name}
                                                onChange={e => {
                                                  const nl = [...criteriaList];
                                                  nl[i].name = e.target.value;
                                                  setCriteriaList(nl);
                                                }}
                                                placeholder="e.g. Grammar" 
                                                className="h-16 border-none bg-slate-100 dark:bg-slate-800 rounded-2xl font-black px-6 text-base"
                                               />
                                             </div>
                                             <div className="md:col-span-6 space-y-3">
                                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scoring Instructions</label>
                                               <Input 
                                                value={c.description}
                                                onChange={e => {
                                                  const nl = [...criteriaList];
                                                  nl[i].description = e.target.value;
                                                  setCriteriaList(nl);
                                                }}
                                                placeholder="e.g. Deduct 1 mark for each punctuation error" 
                                                className="h-16 border-none bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold px-6 italic text-base"
                                               />
                                             </div>
                                             <div className="md:col-span-2 space-y-3">
                                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center block">Scale</label>
                                               <Input 
                                                type="number"
                                                value={c.marks}
                                                onChange={e => {
                                                  const nl = [...criteriaList];
                                                  nl[i].marks = parseInt(e.target.value) || 0;
                                                  setCriteriaList(nl);
                                                }}
                                                className="h-16 border-none bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-center text-primary text-2xl"
                                               />
                                             </div>
                                         </div>
                                      </motion.div>
                                   ))
                                ) : (
                                   Object.entries(questionCriteria).map(([q, data]) => (
                                      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} key={q} className="p-10 rounded-[3.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-2xl space-y-10">
                                         <div className="flex justify-between items-center border-b border-slate-50 dark:border-white/5 pb-8">
                                            <div className="flex items-center gap-6">
                                              <div className="w-16 h-16 rounded-[2rem] bg-primary flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-primary/20 italic">{q}</div>
                                              <div>
                                                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">Question Evaluation</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">AI Scoring Settings</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                              <div className="flex items-center gap-3">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Max Marks</label>
                                                <Input 
                                                  type="number" 
                                                  value={data.maxMarks} 
                                                  onChange={e => {
                                                    const nc = { ...questionCriteria };
                                                    nc[q].maxMarks = parseInt(e.target.value) || 0;
                                                    setQuestionCriteria(nc);
                                                  }}
                                                  className="w-24 h-16 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-primary font-black text-center text-xl shadow-inner" 
                                                />
                                              </div>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                  const nc = { ...questionCriteria };
                                                  delete nc[q];
                                                  setQuestionCriteria(nc);
                                                }}
                                                className="text-slate-200 hover:text-red-500 rounded-full h-12 w-12"
                                              >
                                                <Trash2 size={24} />
                                              </Button>
                                            </div>
                                         </div>

                                          <div className="space-y-8">
                                             {data.criteria.map((c, ci) => (
                                               <div key={ci} className="grid grid-cols-12 gap-4 items-center">
                                                  <Input 
                                                   placeholder="Marking Criteria" 
                                                   className="col-span-3 h-16 border-none bg-slate-50 dark:bg-slate-950 font-black text-base rounded-2xl px-4 shadow-sm" 
                                                   value={c.name}
                                                   onChange={e => {
                                                     const nc = { ...questionCriteria };
                                                     nc[q].criteria[ci].name = e.target.value;
                                                     setQuestionCriteria(nc);
                                                   }}
                                                  />
                                                  <Input 
                                                    placeholder="Scoring Instructions..." 
                                                    className="col-span-6 h-16 border-none bg-slate-50 dark:bg-slate-950 text-base rounded-2xl px-4 italic shadow-sm" 
                                                    value={c.description}
                                                    onChange={e => {
                                                      const nc = { ...questionCriteria };
                                                      nc[q].criteria[ci].description = e.target.value;
                                                      setQuestionCriteria(nc);
                                                    }}
                                                  />
                                                  <div className="col-span-3 flex items-center gap-3">
                                                    <Input 
                                                      type="number" 
                                                      placeholder="Mark" 
                                                      className="h-16 border-none bg-primary/[0.03] dark:bg-primary/[0.05] font-black text-center rounded-2xl text-primary shadow-inner text-xl w-24" 
                                                      value={c.marks}
                                                      onChange={e => {
                                                        const nc = { ...questionCriteria };
                                                        nc[q].criteria[ci].marks = parseInt(e.target.value) || 0;
                                                        setQuestionCriteria(nc);
                                                      }}
                                                    />
                                                    <Button 
                                                     variant="ghost" 
                                                     size="icon" 
                                                     onClick={() => {
                                                       const nc = { ...questionCriteria };
                                                       nc[q].criteria = nc[q].criteria.filter((_, idx) => idx !== ci);
                                                       setQuestionCriteria(nc);
                                                     }}
                                                     className="h-16 w-16 text-slate-200 hover:text-red-500 rounded-full transition-colors flex-shrink-0"
                                                    >
                                                     <X size={24} />
                                                    </Button>
                                                  </div>
                                               </div>
                                             ))}
                                            <Button 
                                              variant="ghost" 
                                              onClick={() => {
                                                const nc = { ...questionCriteria };
                                                nc[q].criteria.push({ name: '', description: '', marks: 0 });
                                                setQuestionCriteria(nc);
                                              }}
                                              className="text-primary font-black text-[11px] uppercase tracking-[0.2em] h-14 gap-3 hover:bg-primary/5 px-8 rounded-2xl border border-dashed border-primary/20"
                                            >
                                              <Plus size={20} /> + Add More Criteria
                                            </Button>
                                         </div>
                                      </motion.div>
                                   ))
                                )}
                             </div>
                          </ScrollArea>
                       </div>

                       <div className="absolute bottom-10 left-10 right-10 flex gap-6 z-20">
                          <Button 
                           variant="ghost" 
                           onClick={() => setIsAdding(false)} 
                           className="flex-1 h-20 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[12px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 shadow-2xl"
                          >
                           Cancel
                          </Button>
                          <Button 
                           onClick={saveRubric}
                           className="flex-[2] h-20 rounded-[2.5rem] bg-primary hover:bg-primary/95 font-black uppercase tracking-[0.4em] text-[12px] gap-4 shadow-3xl shadow-primary/30 text-white"
                          >
                           <Save size={28} /> Save Rubric Matrix
                          </Button>
                       </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-12 py-20 grayscale opacity-40">
                       <div className="w-48 h-48 bg-primary/5 rounded-[4.5rem] flex items-center justify-center text-primary relative">
                          <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-8 border-dotted border-primary/10 rounded-[4.5rem]"
                          />
                          <BookOpen size={96} />
                       </div>
                       <div className="text-center space-y-6">
                         <h3 className="text-4xl font-black tracking-tighter text-slate-800 dark:text-slate-100 uppercase">Library Empty</h3>
                         <p className="text-sm font-bold text-slate-400 max-w-sm mx-auto uppercase tracking-widest leading-loose">Access saved rubrics or start a new marking scheme from the sidebar.</p>
                       </div>
                    </div>
                  )}
                </div>
             </div>
           </div>
        </Card>
      )}

      {/* Floating Bottom Navigator for quick evaluation */}
      {selectedSubject && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40"
        >
          <Button 
            onClick={() => navigate(`/evaluate?subjectId=${selectedSubject}`)}
            className="h-24 px-16 rounded-[3rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-[6px] border-white dark:border-slate-900 shadow-3xl font-black uppercase tracking-[0.3em] text-[12px] gap-6 hover:scale-105 active:scale-95 transition-all group"
          >
            <Import size={32} className="group-hover:translate-x-2 transition-transform" /> 
            START EVALUATION
          </Button>
        </motion.div>
      )}
    </div>
  );
}
