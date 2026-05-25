import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  ClipboardCheck,
  ChevronLeft,
  BookOpen,
  Layers,
  Sparkles,
  FileText,
  Import,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Criterion, UnitRubric, Subject } from '@/types';

interface RubricManagerProps {
  subjectId: number;
  onClose: () => void;
  subjectData?: Subject;
}

export default function RubricManager({ subjectId, onClose, subjectData }: RubricManagerProps) {
  const [rubrics, setRubrics] = React.useState<UnitRubric[]>([]);
  const [activeTab, setActiveTab] = React.useState<'unit' | 'question'>('unit');
  
  // State for adding new rubric
  const [isAdding, setIsAdding] = React.useState(false);
  const [currentName, setCurrentName] = React.useState('');
  
  // Mixed criteria state: either flat list for Unit, or dictionary for Question-wise
  const [criteriaList, setCriteriaList] = React.useState<Criterion[]>([]);
  const [questionCriteria, setQuestionCriteria] = React.useState<{ [key: string]: { maxMarks: number, criteria: Criterion[] } }>({
    'Q1': { maxMarks: 5, criteria: [{ name: '', description: '', marks: 0 }] }
  });

  const { token } = useAuth();

  const fetchRubrics = React.useCallback(async () => {
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
  }, [subjectId, token]);

  React.useEffect(() => {
    fetchRubrics();
  }, [fetchRubrics]);

  const saveRubric = async () => {
    if (!currentName) return toast.error("Please provide a rubric identifier.");

    const payload = {
      name: currentName,
      type: activeTab,
      criteria: activeTab === 'unit' ? criteriaList : questionCriteria
    };

    try {
      const res = await fetch(`/api/subjects/${subjectId}/rubrics`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`${activeTab === 'unit' ? 'Unit' : 'Question'} rubric archived successfully.`);
        fetchRubrics();
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
        fetchRubrics();
      }
    } catch (e) {
      toast.error("Failed to delete protocol node.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-2xl bg-white/10 dark:bg-slate-950/40 p-4"
    >
      <Card className="glass-card w-full max-w-[95vw] h-[90vh] overflow-hidden border-none shadow-3xl bg-white/95 dark:bg-slate-950/95 rounded-[4rem] flex flex-col relative mx-auto">
        {/* Header Branding */}
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Sparkles className="text-primary" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Rubric <span className="text-primary italic">Designer</span></span>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-2" />
                <span className="text-sm font-bold text-slate-400 capitalize">{activeTab} Based</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Configure marking schemes for {subjectData?.name || 'Subject'}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="rounded-full h-14 w-14 bg-slate-50 dark:bg-white/5 hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100 dark:border-white/5"
          >
            <X size={24} />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Side Navigation - Library */}
          <div className="w-[450px] border-r border-slate-100 dark:border-white/10 p-10 flex flex-col gap-10 bg-slate-50/50 dark:bg-slate-900/20">
             <div className="space-y-6">
                <label className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 px-2 text-center block">Cognitive Library Hub</label>
                <div className="space-y-4 max-w-[155.062px] mx-auto">
                  <Button 
                    onClick={() => { setIsAdding(true); }}
                    className="w-full h-20 rounded-[2rem] bg-primary hover:bg-primary/95 font-black uppercase tracking-[0.3em] text-[10px] gap-2 shadow-2xl shadow-primary/40 text-white border-2 border-white/20 px-4"
                  >
                    <Plus size={18} /> Initialize
                  </Button>
                </div>
             </div>

             <ScrollArea className="flex-1">
                <div className="space-y-5 pr-6">
                  {rubrics.filter(r => r.type === activeTab).map(r => (
                    <motion.div 
                      layout
                      key={r.id} 
                      className="p-8 rounded-[3rem] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 group hover:border-primary/40 shadow-sm hover:shadow-2xl transition-all flex justify-between items-center"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-5 h-5 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
                        <div>
                          <p className="text-xl font-black text-slate-800 dark:text-slate-100 truncate w-48 leading-none">{r.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Active Architecture</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteRubric(r.id!)}
                        className="h-16 w-16 rounded-[1.5rem] text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-transparent hover:border-red-100"
                      >
                        <Trash2 size={28} />
                      </Button>
                    </motion.div>
                  ))}
                  {rubrics.filter(r => r.type === activeTab).length === 0 && (
                    <div className="text-center py-32 opacity-20 flex flex-col items-center">
                      <Layers size={64} strokeWidth={1} className="mb-6" />
                      <p className="text-xs font-black uppercase tracking-[0.5em]">Void Vault</p>
                    </div>
                  )}
                </div>
             </ScrollArea>
          </div>

          {/* Main Editing Area */}
          <div className="flex-1 flex flex-col">
            <div className="px-10 py-6 border-b border-slate-100 dark:border-white/5">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setIsAdding(false); }} className="w-full">
                <TabsList className="bg-slate-100 dark:bg-white/5 p-1 rounded-2xl h-14 w-full max-w-md border border-slate-200 dark:border-white/10">
                  <TabsTrigger value="unit" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-xl dark:data-[state=active]:bg-slate-900">
                    <Layers size={14} /> Unit-wise Rubric
                  </TabsTrigger>
                  <TabsTrigger value="question" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-xl dark:data-[state=active]:bg-slate-900">
                    <FileText size={14} /> Question-wise Rubric
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 p-10 overflow-hidden relative">
              {isAdding ? (
                <div className="h-full flex flex-col">
                  {/* Step 1: Identity */}
                   <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Rubric Name</label>
                      <Input 
                        placeholder={activeTab === 'unit' ? "e.g. Unit 1 Quiz" : "e.g. Question Bank"} 
                        value={currentName} 
                        onChange={e => setCurrentName(e.target.value)}
                        className="h-20 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 font-bold px-10 text-xl"
                      />
                    </div>
                    {activeTab === 'unit' && (
                       <div className="flex items-end pb-2">
                         <div className="bg-primary/5 rounded-2xl p-6 flex items-center gap-5 border border-primary/10">
                           <Sparkles size={24} className="text-primary" />
                           <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest leading-relaxed">Standard AI Evaluator Mode<br/>Grade Precision: Optimized</p>
                         </div>
                       </div>
                    )}
                  </div>

                  {/* Step 2: Criteria Construction */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                     <div className="flex justify-between items-center mb-6 px-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Marking Formula</label>
                        {activeTab === 'unit' && (
                          <Button 
                            variant="ghost" 
                            onClick={() => setCriteriaList([...criteriaList, { name: '', description: '', marks: 0 }])}
                            className="bg-primary/10 text-primary h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] gap-5 border-2 border-primary/20 px-10 hover:bg-primary hover:text-white transition-all shadow-xl hover:shadow-primary/20"
                          >
                            <Plus size={24} /> Add Marking Row
                          </Button>
                        )}
                        {activeTab === 'question' && (
                          <Button 
                            variant="ghost" 
                            onClick={() => {
                               const nextQ = `Q${Object.keys(questionCriteria).length + 1}`;
                               setQuestionCriteria({ ...questionCriteria, [nextQ]: { maxMarks: 5, criteria: [{ name: '', description: '', marks: 0 }] } });
                            }}
                            className="bg-primary/10 text-primary h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] gap-5 border-2 border-primary/20 px-10 hover:bg-primary hover:text-white transition-all shadow-xl hover:shadow-primary/20"
                          >
                            <Plus size={24} /> Add Question Node
                          </Button>
                        )}
                     </div>

                     <ScrollArea className="flex-1 pr-6">
                        <div className="space-y-6 pb-20">
                           {activeTab === 'unit' ? (
                             criteriaList.map((c, i) => (
                               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={i} className="group relative p-10 rounded-[3.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-2xl transition-all hover:bg-slate-50 dark:hover:bg-white/5 max-w-[615.271px] mx-auto">
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   onClick={() => setCriteriaList(criteriaList.filter((_, idx) => idx !== i))}
                                   className="absolute top-8 right-8 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-900 shadow-sm rounded-2xl h-12 w-12 border border-slate-100"
                                 >
                                   <Trash2 size={24} />
                                 </Button>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                                    <div className="md:col-span-4 space-y-4">
                                       <label className="text-[12px] font-black uppercase tracking-[0.4em] text-primary">Criterion Node</label>
                                       <Input 
                                         value={c.name}
                                         onChange={e => {
                                           const newList = [...criteriaList];
                                           newList[i].name = e.target.value;
                                           setCriteriaList(newList);
                                         }}
                                         placeholder="e.g. Logical Depth" 
                                         className="h-20 border-none bg-slate-100 dark:bg-slate-800 rounded-3xl font-black px-10 text-xl shadow-inner"
                                       />
                                    </div>
                                    <div className="md:col-span-6 space-y-4">
                                       <label className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">Scoring Protocol</label>
                                       <Input 
                                         value={c.description}
                                         onChange={e => {
                                           const newList = [...criteriaList];
                                           newList[i].description = e.target.value;
                                           setCriteriaList(newList);
                                         }}
                                         placeholder="Describe assessment parameters for the AI model..." 
                                         className="h-20 border-none bg-slate-100 dark:bg-slate-800 rounded-3xl font-bold italic px-10 text-lg shadow-inner"
                                       />
                                    </div>
                                    <div className="md:col-span-2 space-y-4 text-center">
                                       <label className="text-[12px] font-black uppercase tracking-[0.4em] text-primary block">Yield</label>
                                       <Input 
                                         type="number"
                                         value={c.marks}
                                         onChange={e => {
                                           const newList = [...criteriaList];
                                           newList[i].marks = parseInt(e.target.value) || 0;
                                           setCriteriaList(newList);
                                         }}
                                         className="h-20 border-none bg-slate-100 dark:bg-slate-800 rounded-3xl font-black text-center text-primary text-3xl shadow-inner"
                                       />
                                    </div>
                                 </div>
                               </motion.div>
                             ))
                           ) : (
                             Object.entries(questionCriteria).map(([q, data]) => (
                               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={q} className="p-12 rounded-[4rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-2xl space-y-12 max-w-[615.271px] mx-auto overflow-hidden">
                                  <div className="flex justify-between items-center border-b border-slate-50 dark:border-white/5 pb-12">
                                     <div className="flex items-center gap-8">
                                       <div className="w-20 h-20 rounded-[2.5rem] bg-primary flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-primary/20 italic">{q}</div>
                                       <div>
                                         <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Question Evaluator</h4>
                                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Marking Scheme Node</p>
                                       </div>
                                     </div>
                                    <div className="flex items-center gap-8">
                                      <div className="flex items-center gap-5">
                                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Total weight</label>
                                        <Input 
                                          type="number" 
                                          value={data.maxMarks} 
                                          onChange={e => {
                                            const newCriteria = { ...questionCriteria };
                                            newCriteria[q].maxMarks = parseInt(e.target.value) || 0;
                                            setQuestionCriteria(newCriteria);
                                          }}
                                          className="w-32 h-16 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-primary font-black text-center text-2xl shadow-inner" 
                                        />
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => {
                                          const newCriteria = { ...questionCriteria };
                                          delete newCriteria[q];
                                          setQuestionCriteria(newCriteria);
                                        }}
                                        className="h-16 w-16 text-slate-200 hover:text-red-500 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 transition-all hover:bg-red-50"
                                      >
                                        <Trash2 size={24} />
                                      </Button>
                                    </div>
                                 </div>

                                 <div className="space-y-10">
                                    {data.criteria.map((c, ci) => (
                                      <div key={ci} className="p-10 rounded-[4rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 shadow-xl group/criteria">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                                           <div className="md:col-span-4 space-y-4">
                                              <label className="text-[12px] font-black uppercase tracking-[0.5em] text-primary">Criterion Segment</label>
                                              <Input 
                                                placeholder="e.g. Cognitive Depth" 
                                                className="h-20 border-none bg-white dark:bg-slate-950 font-black text-2xl rounded-3xl px-10 shadow-inner" 
                                                value={c.name}
                                                onChange={e => {
                                                  const newCriteria = { ...questionCriteria };
                                                  newCriteria[q].criteria[ci].name = e.target.value;
                                                  setQuestionCriteria(newCriteria);
                                                }}
                                              />
                                           </div>
                                           <div className="md:col-span-6 space-y-4">
                                              <label className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">Assessment Protocol</label>
                                              <Input 
                                                placeholder="Describe precision requirements..." 
                                                className="h-20 border-none bg-white dark:bg-slate-950 text-xl font-bold italic rounded-3xl px-10 shadow-inner" 
                                                value={c.description}
                                                onChange={e => {
                                                  const newCriteria = { ...questionCriteria };
                                                  newCriteria[q].criteria[ci].description = e.target.value;
                                                  setQuestionCriteria(newCriteria);
                                                }}
                                              />
                                           </div>
                                           <div className="md:col-span-2 flex items-end gap-6 h-full">
                                              <div className="flex-1 space-y-4 text-center">
                                                <label className="text-[12px] font-black uppercase tracking-[0.5em] text-primary block">Yield</label>
                                                <Input 
                                                  type="number" 
                                                  placeholder="0" 
                                                  className="h-20 border-none bg-white dark:bg-slate-950 font-black text-center rounded-[2rem] text-4xl text-primary shadow-inner" 
                                                  value={c.marks}
                                                  onChange={e => {
                                                    const newCriteria = { ...questionCriteria };
                                                    newCriteria[q].criteria[ci].marks = parseInt(e.target.value) || 0;
                                                    setQuestionCriteria(newCriteria);
                                                  }}
                                                />
                                              </div>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                  const newCriteria = { ...questionCriteria };
                                                  newCriteria[q].criteria = newCriteria[q].criteria.filter((_, idx) => idx !== ci);
                                                  setQuestionCriteria(newCriteria);
                                                }}
                                                className="h-20 w-20 text-slate-200 hover:text-red-500 rounded-[2rem] flex-shrink-0 bg-white dark:bg-slate-950 border border-slate-100 shadow-sm transition-all hover:scale-110 active:scale-90"
                                              >
                                                <X size={36} />
                                              </Button>
                                           </div>
                                        </div>
                                      </div>
                                    ))}
                                    <Button 
                                      variant="ghost" 
                                      onClick={() => {
                                        const newCriteria = { ...questionCriteria };
                                        newCriteria[q].criteria.push({ name: '', description: '', marks: 0 });
                                        setQuestionCriteria(newCriteria);
                                      }}
                                      className="text-primary font-black text-xs uppercase tracking-[0.4em] h-20 gap-6 hover:bg-primary hover:text-white px-12 rounded-[2.5rem] border-4 border-dashed border-primary/20 w-fit transition-all shadow-xl hover:shadow-primary/20"
                                    >
                                      <Plus size={32} strokeWidth={3} /> Initialize Criterion Node
                                    </Button>
                                 </div>
                               </motion.div>
                             ))
                           )}
                        </div>
                     </ScrollArea>

                     {/* Footer Actions */}
                     <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-white dark:from-slate-950 via-white/80 dark:via-slate-950/80 to-transparent flex gap-6 mt-auto">
                        <Button variant="ghost" onClick={() => setIsAdding(false)} className="flex-1 h-20 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[12px] bg-slate-50 dark:bg-white/5 border border-slate-100">Cancel</Button>
                        <Button 
                          onClick={saveRubric}
                          className="flex-[2] h-20 rounded-[2.5rem] bg-primary hover:bg-primary/90 font-black uppercase tracking-[0.4em] text-[12px] gap-4 shadow-3xl shadow-primary/30 text-white"
                        >
                          <Save size={24} /> Save Rubric Matrix
                        </Button>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-10">
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="w-40 h-40 bg-primary/5 rounded-[4rem] flex items-center justify-center text-primary relative"
                   >
                     <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-dashed border-primary/10 rounded-[4rem]"
                     />
                     <BookOpen size={64} className="relative z-10" />
                   </motion.div>
                   <div className="text-center space-y-4">
                      <h3 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100 uppercase">Library Empty</h3>
                      <p className="text-xs font-bold text-slate-400 max-w-sm mx-auto uppercase tracking-widest leading-loose">Choose a stored rubric from the library or create a new marking scheme to get started.</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Apply Button */}
        <div className="absolute bottom-8 right-8">
           <Button 
            onClick={onClose}
            className="h-20 px-10 rounded-[2.5rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-4 border-white dark:border-slate-900 shadow-3xl font-black uppercase tracking-widest text-xs gap-3 hover:scale-105 active:scale-95 transition-all group"
           >
             <Import size={20} className="group-hover:translate-y-1 transition-transform" /> 
             Apply to current process
           </Button>
        </div>
      </Card>
    </motion.div>
  );
}
