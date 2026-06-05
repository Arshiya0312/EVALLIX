import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSearch, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw, 
  BrainCircuit,
  FileText,
  FileDigit,
  Maximize2,
  ChevronRight,
  TrendingUp,
  Layout,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Class, Subject, Student, EvaluationResult } from '@/types';

const NeuralBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-40">
    <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
        </pattern>
        <radialGradient id="sphere" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
      {[...Array(20)].map((_, i) => (
        <motion.circle
          key={i}
          r={Math.random() * 2 + 1}
          fill="var(--color-primary)"
          initial={{ 
            x: Math.random() * 1000, 
            y: Math.random() * 1000,
            opacity: Math.random() * 0.5 
          }}
          animate={{ 
            y: [null, Math.random() * 1000],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ 
            duration: Math.random() * 10 + 10, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      ))}

      <motion.circle
        cx="200" cy="200" r="250"
        fill="url(#sphere)"
        animate={{
          cx: [200, 800, 200],
          cy: [200, 600, 200],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  </div>
);

export default function Evaluation() {
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  
  const [selectedClass, setSelectedClass] = React.useState<string>('');
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');
  const [selectedStudent, setSelectedStudent] = React.useState<string>('');
  
  const [questionPaper, setQuestionPaper] = React.useState<File | null>(null);
  const [answerSheet, setAnswerSheet] = React.useState<File | null>(null);
  
  const [isEvaluating, setIsEvaluating] = React.useState(false);
  const [result, setResult] = React.useState<EvaluationResult | null>(null);
  const [progress, setProgress] = React.useState(0);

  const { token } = useAuth();

  const downloadPDF = async () => {
    const element = document.getElementById('report-frame');
    if (!element) return;
    
    toast.loading("Synthesizing neural report archive...");
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#020617' : '#ffffff',
        onclone: (clonedDoc) => {
          const frame = clonedDoc.getElementById('report-frame');
          if (frame) {
            // Expand frame and remove clipping
            frame.style.height = 'auto';
            frame.style.overflow = 'visible';
            frame.style.borderRadius = '0'; // Clean edges for PDF
            
            // Re-target potential clipped areas
            const query = frame.querySelectorAll('[class*="h-[600px]"], [class*="max-h-"]');
            query.forEach(el => {
              (el as HTMLElement).style.height = 'auto';
              (el as HTMLElement).style.maxHeight = 'none';
              (el as HTMLElement).style.overflow = 'visible';
            });

            // Find Radix Viewports
            const viewports = frame.querySelectorAll('[data-radix-scroll-area-viewport]');
            viewports.forEach(vp => {
              (vp as HTMLElement).style.height = 'auto';
              (vp as HTMLElement).style.overflow = 'visible';
              (vp as HTMLElement).style.display = 'block';
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const imgProps = (new jsPDF()).getImageProperties(imgData);
      const pdfWidth = 210;
      const scaledImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, scaledImgHeight]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledImgHeight);
      const student = students.find(s => s.id.toString() === selectedStudent);
      pdf.save(`Neural_Evaluation_${student?.roll_no || 'Record'}.pdf`);
      toast.dismiss();
      toast.success("Identity evaluation report exported.");
    } catch (e) {
      console.error("PDF Export Error:", e);
      toast.dismiss();
      toast.error("Neural export failed. Buffer overflow or memory exhaustion.");
    }
  };

  React.useEffect(() => {
    fetch('/api/classes', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : [])
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, [token]);

  const handleClassChange = async (val: string) => {
    setSelectedClass(val);
    setSelectedSubject('');
    setSelectedStudent('');
    const [subRes, stuRes] = await Promise.all([
      fetch(`/api/classes/${val}/subjects`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/classes/${val}/students`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    setSubjects(await subRes.json());
    setStudents(await stuRes.json());
  };

  const startEvaluation = async () => {
    if (!questionPaper || !answerSheet || !selectedStudent || !selectedSubject) {
      return toast.error("Selection incomplete. All node inputs required.");
    }

    setIsEvaluating(true);
    setProgress(10);
    
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 5, 90));
    }, 500);

    const formData = new FormData();
    formData.append('questionPaper', questionPaper);
    formData.append('answerSheet', answerSheet);
    formData.append('subjectId', selectedSubject);
    formData.append('studentId', selectedStudent);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      clearInterval(interval);
      setProgress(100);
      
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        toast.success("Identity profile verified and evaluated.");
      } else {
        const err = await res.json();
        console.error("Evaluation Error Details:", err);
        toast.error(`Forensic node processing failed: ${err.details || "Unknown Error"}`);
      }
    } catch (e: any) {
      console.error("Neural link timeout error:", e);
      toast.error("Neural link timeout. Connection severed or processing overloaded.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-12 pb-20 relative">
      <NeuralBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-2 relative z-10"
      >
        <div>
          <h1 className="text-5xl font-black tracking-tighter mb-2 text-slate-800 dark:text-white">Neural <span className="text-primary">Evaluator</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Multi-modal AI assessment chamber</p>
        </div>
        
        <div className="flex gap-4">
          {result && (
            <Button variant="outline" onClick={downloadPDF} className="h-12 rounded-2xl gap-2 font-bold text-slate-600 border-slate-200">
               <Download size={18} /> Export PDF
            </Button>
          )}
          {result && (
            <Button variant="ghost" onClick={() => { setResult(null); setAnswerSheet(null); }} className="h-12 rounded-2xl gap-2 font-bold text-primary hover:bg-primary/10">
              <RotateCcw size={18} /> New Cycle
            </Button>
          )}
        </div>
      </motion.div>

      {!result ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Controls Panel */}
          <Card className="glass-card border-none shadow-2xl p-8 rounded-[3rem] h-fit bg-white/90 dark:bg-slate-900/90">
            <div className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">I. Institutional Context (Class)</label>
                       <Select onValueChange={handleClassChange}>
                         <SelectTrigger className="border-primary/5 shadow-xl shadow-primary/5 bg-white/50 backdrop-blur-xl">
                           <SelectValue placeholder="Identify Class Node" />
                         </SelectTrigger>
                         <SelectContent className="rounded-[2rem] border-none shadow-3xl dark:bg-slate-900 min-w-[200px]">
                           {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                         </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">II. Knowledge Domain (Subject)</label>
                       <Select onValueChange={setSelectedSubject} disabled={!selectedClass}>
                         <SelectTrigger className="border-primary/5 shadow-xl shadow-primary/5 bg-white/50 backdrop-blur-xl">
                           <SelectValue placeholder="Specify Subject Node" />
                         </SelectTrigger>
                         <SelectContent className="rounded-[2rem] border-none shadow-3xl dark:bg-slate-900 min-w-[200px]">
                           {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                         </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">III. Target Identity (Student)</label>
                       <Select onValueChange={setSelectedStudent} disabled={!selectedClass}>
                         <SelectTrigger className="border-primary/5 shadow-xl shadow-primary/5 bg-white/50 backdrop-blur-xl">
                           <SelectValue placeholder="Select Roll Identifier" />
                         </SelectTrigger>
                         <SelectContent className="rounded-[2rem] border-none shadow-3xl dark:bg-slate-900 min-w-[200px]">
                           {students.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.roll_no} - {s.name}</SelectItem>)}
                         </SelectContent>
                       </Select>
                    </div>
                  </div>

               <div className="pt-4 space-y-6">
                  <Button 
                    variant="ghost" 
                    className="w-full h-20 rounded-[2rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary transition-all p-0 group"
                    onClick={() => document.getElementById('qp-input')?.click()}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${questionPaper ? "bg-emerald-50 text-emerald-500" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"}`}>
                        <FileText size={20} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">{questionPaper ? 'Question Paper Logged' : 'Upload Question Paper'}</span>
                    </div>
                    {questionPaper && <span className="text-[9px] text-emerald-500 font-black truncate max-w-[200px]">{questionPaper.name}</span>}
                    <input id="qp-input" type="file" className="hidden" onChange={e => setQuestionPaper(e.target.files?.[0] || null)} />
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full h-20 rounded-[2rem] border-2 border-dashed border-primary/10 flex flex-col items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary transition-all p-0 group"
                    onClick={() => document.getElementById('as-input')?.click()}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${answerSheet ? "bg-emerald-50 text-emerald-500" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"}`}>
                        <FileDigit size={20} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">{answerSheet ? 'Answer Sheet Logged' : 'Upload Answer Sheet'}</span>
                    </div>
                    {answerSheet && <span className="text-[9px] text-emerald-500 font-black truncate max-w-[200px]">{answerSheet.name}</span>}
                    <input id="as-input" type="file" className="hidden" onChange={e => setAnswerSheet(e.target.files?.[0] || null)} />
                  </Button>
               </div>

               <Button 
                 disabled={isEvaluating}
                 onClick={startEvaluation}
                 className="w-full h-20 rounded-[2.5rem] bg-primary hover:bg-primary/90 font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 gap-4 btn-pulse"
               >
                 {isEvaluating ? (
                   <>
                     <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                     Evaluating Node...
                   </>
                 ) : (
                   <>
                     <BrainCircuit size={24} />
                     Ignite Intelligence
                   </>
                 )}
               </Button>
            </div>
          </Card>

          {/* Visualization Area */}
          <div className="lg:col-span-2">
             <Card className="bg-slate-900 border-none shadow-3xl h-full rounded-[4rem] overflow-hidden flex items-center justify-center p-8 md:p-16 text-center relative border border-white/5 group">
                {isEvaluating ? (
                   <div className="flex flex-col items-center gap-16 w-full max-w-sm relative z-10">
                      <div className="relative">
                        <motion.div 
                          className="w-40 h-40 bg-primary/20 rounded-full blur-3xl absolute inset-0"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                        <div className="w-40 h-40 bg-primary rounded-[3rem] flex items-center justify-center text-white shadow-2xl shadow-primary/50 relative z-10">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          >
                            <BrainCircuit size={64} />
                          </motion.div>
                        </div>
                        {/* Scanning Line */}
                        <motion.div 
                          className="absolute -inset-4 border-t-2 border-primary/50 z-20 pointer-events-none"
                          animate={{ top: ['0%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>

                      <div className="space-y-6 w-full">
                        <div className="flex justify-between items-end mb-2">
                          <div className="space-y-1 text-left">
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-white opacity-60">Forensic Stream Analysis</p>
                            <p className="text-[10px] font-bold text-primary animate-pulse tracking-widest">PROCESSING NEURAL NODES...</p>
                          </div>
                          <p className="text-3xl font-black text-primary">{Math.round(progress)}%</p>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                           <motion.div 
                             className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 shadow-[0_0_20px_rgba(var(--color-primary),0.5)]"
                             initial={{ width: 0 }}
                             animate={{ width: `${progress}%` }}
                             transition={{ type: "spring", bounce: 0.2 }}
                           />
                        </div>
                      </div>
                      <div className="flex gap-2">
                         {[1,2,3].map(i => (
                           <motion.div 
                             key={i}
                             className="w-2 h-2 rounded-full bg-primary"
                             animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                             transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                           />
                         ))}
                      </div>
                   </div>
                ) : (
                   <div className="relative z-10">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center text-slate-700 dark:text-slate-500 mb-10 mx-auto border border-white/5 relative group-hover:border-primary/20 transition-all shadow-inner"
                      >
                        <Layout size={60} />
                        <div className="absolute inset-0 bg-primary/5 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.div>
                      <h3 className="text-4xl font-black text-slate-300 tracking-tighter mb-4 group-hover:text-white transition-colors">Neuro-Chamber Ready</h3>
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.6em] max-w-xs mx-auto opacity-70 group-hover:opacity-100 transition-opacity">Load entity materials to begin cinematic synthesis</p>
                   </div>
                )}
                
                {/* Visual accents */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
             </Card>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-6xl mx-auto"
        >
          <div id="report-frame" className="bg-white dark:bg-slate-950 p-12 md:p-20 rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary via-red-400 to-primary/20" />
             
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Header Section */}
                <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-100 dark:border-white/5 pb-16 gap-12">
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Badge className="bg-primary text-white border-none uppercase font-black tracking-[0.5em] text-[8px] py-1.5 px-4 rounded-full shadow-lg shadow-primary/20">Official Evaluation Matrix</Badge>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Node ID: {selectedStudent}-{selectedSubject}</span>
                      </div>
                      <h2 className="text-7xl font-black tracking-tighter text-slate-800 dark:text-white leading-[0.9]">
                         {students.find(s => s.id.toString() === selectedStudent)?.name}
                      </h2>
                      <div className="flex flex-wrap gap-x-12 gap-y-4 pt-4 border-t border-slate-50 dark:border-white/5">
                        <div className="group">
                           <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-1 opacity-60">Roll Identifier</p>
                           <p className="text-lg font-black text-slate-700 dark:text-slate-300 tracking-tight">{students.find(s => s.id.toString() === selectedStudent)?.roll_no}</p>
                        </div>
                        <div className="group">
                           <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-1 opacity-60">Field Node</p>
                           <p className="text-lg font-black text-slate-700 dark:text-slate-300 tracking-tight">{subjects.find(s => s.id.toString() === selectedSubject)?.name}</p>
                        </div>
                        <div className="group">
                           <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-1 opacity-60">Cycle Date</p>
                           <p className="text-lg font-black text-slate-700 dark:text-slate-300 tracking-tight">{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-10 bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[4rem] border border-slate-100 dark:border-white/5 shadow-inner">
                      <div className="text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] mb-3">Gross Accuracy</p>
                         <div className="text-8xl font-black tracking-tighter text-primary leading-none">
                            {result.score}
                         </div>
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-3">/ {result.total}</p>
                      </div>
                      <Separator orientation="vertical" className="h-24 bg-slate-200 dark:bg-white/10" />
                      <div className="text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] mb-3">Efficiency</p>
                         <div className="text-5xl font-black tracking-tighter text-slate-800 dark:text-white leading-none">
                            {Math.round((result.score / result.total) * 100)}%
                         </div>
                         <div className="w-20 h-1.5 mt-5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mx-auto shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(result.score / result.total) * 100}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-primary" 
                            />
                         </div>
                      </div>
                   </div>
                </div>

                {/* Synthesis Section */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div className="p-12 rounded-[4rem] bg-primary/[0.03] border border-primary/5 relative group cursor-default">
                         <div className="absolute top-8 left-8 text-primary/10"><BrainCircuit size={40} /></div>
                         <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-10 pl-12">Executive Evaluation Commentary</h3>
                         <p className="text-3xl font-bold text-slate-700 dark:text-slate-300 leading-[1.3] italic tracking-tight relative z-10">
                           "{result.feedback}"
                         </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div className="p-10 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10 dark:bg-emerald-500/[0.02] transition-colors">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-600 dark:text-emerald-400 mb-8 flex items-center gap-2">
                               <TrendingUp size={16} className="animate-bounce" /> Cognitive Strengths
                            </h4>
                            <ul className="space-y-5">
                               {result.summary.strengths.map((s, i) => (
                                 <motion.li 
                                   initial={{ opacity: 0, x: -10 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   transition={{ delay: i * 0.1 }}
                                   key={i} 
                                   className="flex items-start gap-4 text-sm font-bold text-slate-600 dark:text-slate-400 leading-tight"
                                 >
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 shadow-lg shadow-emerald-500/20" />
                                    {s}
                                 </motion.li>
                               ))}
                            </ul>
                         </div>
                         <div className="p-10 rounded-[3rem] bg-amber-500/5 border border-amber-500/10 dark:bg-amber-500/[0.02] transition-colors">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-600 dark:text-amber-400 mb-8 flex items-center gap-2">
                               <AlertCircle size={16} className="animate-pulse" /> Critical Gaps
                            </h4>
                            <ul className="space-y-5">
                               {result.summary.weaknesses.map((w, i) => (
                                 <motion.li 
                                   initial={{ opacity: 0, x: -10 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   transition={{ delay: i * 0.1 }}
                                   key={i} 
                                   className="flex items-start gap-4 text-sm font-bold text-slate-600 dark:text-slate-400 leading-tight"
                                 >
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0 shadow-lg shadow-amber-500/20" />
                                    {w}
                                 </motion.li>
                               ))}
                            </ul>
                         </div>
                      </div>
                   </div>

                   {/* Granular Matrix */}
                   <div className="space-y-8">
                      <div className="flex items-center gap-6 mb-4">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 whitespace-nowrap">Forensic Question Matrix</h3>
                         <div className="h-[1px] w-full bg-slate-100 dark:bg-white/5" />
                      </div>
                      <ScrollArea className="h-[600px] pr-6">
                        <div className="space-y-6">
                          {result.questions.map((q, i) => (
                            <div key={i} className="p-10 rounded-[3.5rem] border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900/50 shadow-sm flex items-start gap-8 relative overflow-hidden group">
                               <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center font-black text-2xl text-primary shadow-inner shrink-0 transition-all duration-500 group-hover:bg-primary group-hover:text-white">
                                  {q.q_no}
                               </div>
                               <div className="flex-1 space-y-6">
                                  <div className="flex justify-between items-baseline">
                                     <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Analysis Segment {i+1}</p>
                                     <div className="font-black text-slate-800 dark:text-white flex items-baseline gap-1">
                                        <span className="text-3xl">{q.obtained_marks}</span>
                                        <span className="text-xs opacity-30">/ {q.max_marks}</span>
                                     </div>
                                  </div>
                                  <div className="p-6 rounded-[1.5rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-50 dark:border-white/5">
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">"{q.comment}"</p>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                     <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${(q.obtained_marks / q.max_marks) * 100}%` }}
                                       transition={{ duration: 1, delay: i * 0.1 }}
                                       className={`h-full ${q.obtained_marks / q.max_marks > 0.7 ? 'bg-emerald-500' : 'bg-amber-500 hover:bg-red-500 transition-colors'}`}
                                     />
                                  </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                   </div>
                </div>

                <div className="lg:col-span-12 pt-16 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.8em]">End of Automated Forensic Assessment Matrix • CRC Verified</p>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center font-black text-primary text-xl">S</div>
                      <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-300 text-xl">E</div>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
